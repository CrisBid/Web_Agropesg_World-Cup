/**
 * Importa palpites da planilha "Bolao Copa 2026.xlsx" para o PostgreSQL.
 * Uso: DATABASE_URL="..." npx tsx scripts/import-xlsx.ts <caminho-para-o-xlsx>
 */

import * as path from "path";
import * as XLSX from "xlsx";
import { prisma } from "../lib/prisma";

const XLSX_PATH = process.argv[2] ?? path.join(process.cwd(), "..", "Bolao Copa 2026.xlsx");

const PLAYER_SHEETS = [
  "Adriely","Allan","Andre M","Andre T","Bruno A","Bruno G","Bruno L",
  "Caio","Cassio","Cristiane","Domenico","Eder","Ernesto","Fabio S",
  "Fabio K","Francisco","Gian","Glaucio","Guilherme F","Guilherme V",
  "Gustavo","Jhonata","Joao","Lucas","Leandro","Lorrany S","Lorrany M",
  "Luiggi","Marcia","Matheus","Oscar","Osmar","Paulo","Rafael",
  "Ricardo","Romes","Vanessa","Wanderson",
];

// Remove " (N)" ou "(N)" do final do nome do time, ex: "França(1)" → "França"
function stripRank(name: string): string {
  return String(name).replace(/\s*\(\d+\)\s*$/, "").trim();
}

// Linha deve ter gameId numérico na coluna correta
function isGameRow(row: unknown[], col: number): boolean {
  const v = row[col];
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 104;
}

interface Predictions {
  groups:   Record<number, { scoreA: number; scoreB: number }>;
  knockout: Record<number, { winner: string | null; scoreA: number | null; scoreB: number | null }>;
  champion: string | null;
  thirdPlace: string | null;
}

function parseSheet(ws: XLSX.WorkSheet): { fullName: string; predictions: Predictions } {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

  // Nome completo está na primeira linha, coluna 0
  const fullName = String(rows[0]?.[0] ?? "").trim();

  const groups: Predictions["groups"] = {};
  const knockout: Predictions["knockout"] = {};
  let champion: string | null = null;
  let thirdPlace: string | null = null;

  // ── Fase de grupos (rows 9–80): gameId em col[1], placar em col[20]/col[22] ──
  for (let r = 9; r <= 80; r++) {
    const row = rows[r];
    if (!row || !isGameRow(row, 1)) continue;
    const gameId = row[1] as number;
    const scoreA = row[20];
    const scoreB = row[22];
    if (typeof scoreA === "number" && typeof scoreB === "number") {
      groups[gameId] = { scoreA, scoreB };
    }
  }

  // ── Mata-mata: gameId em col[15], time A em col[19], col[20]/[22] placar ──
  // Last32 (rows 93–108), Last16 (rows 113–120), Quarters (125–128),
  // Semis (133–134), 3rd (138), Final (142)
  const knockoutRows = [
    ...range(93, 108),
    ...range(113, 120),
    ...range(125, 128),
    133, 134, 138, 142,
  ];

  for (const r of knockoutRows) {
    const row = rows[r];
    if (!row || !isGameRow(row, 15)) continue;

    const gameId  = row[15] as number;
    const teamARaw = String(row[19] ?? "");
    const scoreA   = row[20];
    const scoreB   = row[22];
    const teamBRaw = String(row[23] ?? "");
    const winnerRaw = String(row[26] ?? "");   // explícito em quartas, semis, 3°, final

    const teamA = stripRank(teamARaw);
    const teamB = stripRank(teamBRaw);
    const sA = typeof scoreA === "number" ? scoreA : null;
    const sB = typeof scoreB === "number" ? scoreB : null;

    let winner: string | null = null;

    if (winnerRaw && winnerRaw !== "0") {
      // Explícito (quartas em diante)
      winner = stripRank(winnerRaw);
    } else if (sA !== null && sB !== null) {
      // Derivar do placar
      if (sA > sB)      winner = teamA || null;
      else if (sB > sA) winner = teamB || null;
      // empate → sem vencedor claro (pênaltis não mapeados)
    }

    knockout[gameId] = { winner, scoreA: sA, scoreB: sB };

    // Campeão = vencedor do jogo 104 (Final)
    if (gameId === 104 && winner) champion = winner;
    // 3° lugar = vencedor do jogo 103
    if (gameId === 103 && winner) thirdPlace = winner;
  }

  return { fullName, predictions: { groups, knockout, champion, thirdPlace } };
}

function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

async function main() {
  console.log(`\nLendo planilha: ${XLSX_PATH}\n`);
  const wb = XLSX.readFile(XLSX_PATH);

  let created = 0;
  let updated = 0;
  let predCount = 0;

  for (let idx = 0; idx < PLAYER_SHEETS.length; idx++) {
    const sheetName = PLAYER_SHEETS[idx];
    const ws = wb.Sheets[sheetName];
    if (!ws) { console.warn(`  ⚠ Aba "${sheetName}" não encontrada, pulando`); continue; }

    const { fullName, predictions } = parseSheet(ws);
    if (!fullName) { console.warn(`  ⚠ Nome vazio na aba "${sheetName}", pulando`); continue; }

    // Buscar ou criar participante por nome (match case-insensitive)
    let participant = await prisma.participant.findFirst({
      where: { name: { equals: fullName, mode: "insensitive" } },
    });

    if (!participant) {
      // Gerar telefone placeholder único
      const phone = `0000000${String(idx + 1).padStart(3, "0")}`;
      participant = await prisma.participant.create({
        data: { id: Date.now().toString() + idx, name: fullName, phone },
      });
      created++;
      console.log(`  ✚ Criado: ${fullName} (tel placeholder: ${phone})`);
    } else {
      updated++;
      console.log(`  ✓ Encontrado: ${fullName}`);
    }

    const participantId = participant.id;

    // Atualizar campeão/3° no participante
    await prisma.participant.update({
      where: { id: participantId },
      data: {
        predictedChampion: predictions.champion,
        predictedThirdPlace: predictions.thirdPlace,
      },
    });

    // Upsert palpites de grupos
    for (const [gidStr, pred] of Object.entries(predictions.groups)) {
      await prisma.groupPrediction.upsert({
        where: { participantId_gameId: { participantId, gameId: Number(gidStr) } },
        update: { scoreA: pred.scoreA, scoreB: pred.scoreB },
        create: { participantId, gameId: Number(gidStr), scoreA: pred.scoreA, scoreB: pred.scoreB },
      });
      predCount++;
    }

    // Upsert palpites de mata-mata
    for (const [gidStr, pred] of Object.entries(predictions.knockout)) {
      await prisma.knockoutPrediction.upsert({
        where: { participantId_gameId: { participantId, gameId: Number(gidStr) } },
        update: { winner: pred.winner, scoreA: pred.scoreA, scoreB: pred.scoreB },
        create: { participantId, gameId: Number(gidStr), winner: pred.winner, scoreA: pred.scoreA, scoreB: pred.scoreB },
      });
      predCount++;
    }
  }

  console.log(`\n✅ Importação concluída!`);
  console.log(`   Participantes criados:   ${created}`);
  console.log(`   Participantes atualizados: ${updated}`);
  console.log(`   Palpites importados:     ${predCount}`);
}

main()
  .catch((e) => { console.error("❌ Erro:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
