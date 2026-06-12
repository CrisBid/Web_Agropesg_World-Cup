/**
 * One-time migration: imports existing JSON data into PostgreSQL.
 * Run with:  npx tsx scripts/migrate-json-to-db.ts
 */
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";

const DATA_DIR = path.join(process.cwd(), "data");

function readJson<T>(filename: string, defaultValue: T): T {
  const file = path.join(DATA_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return defaultValue;
  }
}

interface OldParticipant {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  lockedAt?: string | null;
  isAdmin?: boolean;
}

interface OldGroupPrediction {
  scoreA: number | null;
  scoreB: number | null;
}

interface OldKnockoutPrediction {
  winner: string | null;
  scoreA?: number | null;
  scoreB?: number | null;
}

interface OldPredictions {
  groups: Record<string, OldGroupPrediction>;
  knockout: Record<string, OldKnockoutPrediction>;
  champion: string | null;
  thirdPlace: string | null;
}

interface OldResults {
  groups: Record<string, { scoreA: number; scoreB: number }>;
  knockout: Record<string, { winner: string; scoreA?: number; scoreB?: number }>;
  knockoutTeams?: Record<string, { teamA: string; teamB: string }>;
  champion: string | null;
  thirdPlace: string | null;
}

async function main() {
  console.log("Iniciando migração JSON → PostgreSQL...\n");

  // ── Participants ──────────────────────────────────────────────────────────
  const participants = readJson<OldParticipant[]>("participants.json", []);
  console.log(`Migrando ${participants.length} participantes...`);

  for (const p of participants) {
    await prisma.participant.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        phone: p.phone,
        createdAt: new Date(p.createdAt),
        lockedAt: p.lockedAt ? new Date(p.lockedAt) : null,
        isAdmin: p.isAdmin ?? false,
      },
    });
  }
  console.log(`  ✓ ${participants.length} participantes importados`);

  // ── Predictions ───────────────────────────────────────────────────────────
  const allPredictions = readJson<Record<string, OldPredictions>>("predictions.json", {});
  let predCount = 0;

  for (const [participantId, preds] of Object.entries(allPredictions)) {
    const exists = await prisma.participant.findUnique({ where: { id: participantId } });
    if (!exists) {
      console.warn(`  ⚠ Participante ${participantId} não encontrado, pulando palpites`);
      continue;
    }

    // Update champion/thirdPlace on participant
    await prisma.participant.update({
      where: { id: participantId },
      data: {
        predictedChampion: preds.champion,
        predictedThirdPlace: preds.thirdPlace,
      },
    });

    // Group predictions
    for (const [gameIdStr, pred] of Object.entries(preds.groups)) {
      await prisma.groupPrediction.upsert({
        where: { participantId_gameId: { participantId, gameId: Number(gameIdStr) } },
        update: { scoreA: pred.scoreA, scoreB: pred.scoreB },
        create: { participantId, gameId: Number(gameIdStr), scoreA: pred.scoreA, scoreB: pred.scoreB },
      });
      predCount++;
    }

    // Knockout predictions
    for (const [gameIdStr, pred] of Object.entries(preds.knockout)) {
      await prisma.knockoutPrediction.upsert({
        where: { participantId_gameId: { participantId, gameId: Number(gameIdStr) } },
        update: { winner: pred.winner, scoreA: pred.scoreA ?? null, scoreB: pred.scoreB ?? null },
        create: {
          participantId,
          gameId: Number(gameIdStr),
          winner: pred.winner,
          scoreA: pred.scoreA ?? null,
          scoreB: pred.scoreB ?? null,
        },
      });
      predCount++;
    }
  }
  console.log(`  ✓ ${predCount} palpites importados`);

  // ── Results ───────────────────────────────────────────────────────────────
  const results = readJson<OldResults>("results.json", {
    groups: {},
    knockout: {},
    champion: null,
    thirdPlace: null,
  });

  let groupResultCount = 0;
  for (const [gameIdStr, r] of Object.entries(results.groups)) {
    await prisma.groupResult.upsert({
      where: { gameId: Number(gameIdStr) },
      update: { scoreA: r.scoreA, scoreB: r.scoreB },
      create: { gameId: Number(gameIdStr), scoreA: r.scoreA, scoreB: r.scoreB },
    });
    groupResultCount++;
  }

  let knockoutResultCount = 0;
  for (const [gameIdStr, r] of Object.entries(results.knockout)) {
    await prisma.knockoutResult.upsert({
      where: { gameId: Number(gameIdStr) },
      update: { winner: r.winner, scoreA: r.scoreA ?? null, scoreB: r.scoreB ?? null },
      create: {
        gameId: Number(gameIdStr),
        winner: r.winner,
        scoreA: r.scoreA ?? null,
        scoreB: r.scoreB ?? null,
      },
    });
    knockoutResultCount++;
  }

  if (results.knockoutTeams) {
    for (const [gameIdStr, t] of Object.entries(results.knockoutTeams)) {
      await prisma.knockoutTeam.upsert({
        where: { gameId: Number(gameIdStr) },
        update: { teamA: t.teamA, teamB: t.teamB },
        create: { gameId: Number(gameIdStr), teamA: t.teamA, teamB: t.teamB },
      });
    }
  }

  await prisma.tournamentSettings.upsert({
    where: { id: 1 },
    update: { champion: results.champion, thirdPlace: results.thirdPlace },
    create: { id: 1, champion: results.champion, thirdPlace: results.thirdPlace },
  });

  console.log(`  ✓ ${groupResultCount} resultados de grupos importados`);
  console.log(`  ✓ ${knockoutResultCount} resultados de mata-mata importados`);
  console.log("\n✅ Migração concluída com sucesso!");
}

main()
  .catch((e) => { console.error("❌ Erro na migração:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
