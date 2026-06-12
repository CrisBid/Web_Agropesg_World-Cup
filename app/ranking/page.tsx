import { getParticipants, getResults, getPredictions } from "@/lib/data";
import { calcTotalPoints } from "@/lib/scoring";
import { GAMES } from "@/lib/games-data";
import type { Phase } from "@/lib/games-data";
import Link from "next/link";
import LiveRanking from "./LiveRanking";

export const dynamic = "force-dynamic";

// Prêmios por colocação (em centavos para evitar aritmética de ponto flutuante)
const PRIZES_CENTS = [220000, 80000, 50000, 20000, 10000];

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Posição densa: empates compartilham a mesma posição e a próxima posição NÃO pula.
// Ex: 100, 100, 80 → 1º, 1º, 2º
function densePosition(ranking: { total: number }[], i: number): number {
  const distinctHigher = new Set(
    ranking.filter((p) => p.total > ranking[i].total).map((p) => p.total)
  ).size;
  return distinctHigher + 1;
}

// Calcula o prêmio de cada participante considerando empates.
// Empatados dividem apenas o prêmio da posição que ocupam.
function calcPrizes(ranking: { total: number }[]): (number | null)[] {
  const prizes: (number | null)[] = new Array(ranking.length).fill(null);

  for (let i = 0; i < ranking.length; i++) {
    const pos = densePosition(ranking, i);
    if (pos > PRIZES_CENTS.length) continue;
    const tiedCount = ranking.filter((p) => p.total === ranking[i].total).length;
    prizes[i] = Math.round(PRIZES_CENTS[pos - 1] / tiedCount);
  }

  return prizes;
}

export default async function RankingPage() {
  const [participants, results] = await Promise.all([getParticipants(), getResults()]);

  const gamesPhaseMap: Record<number, Phase> = {};
  for (const g of GAMES) gamesPhaseMap[g.id] = g.phase;

  const ranking = await Promise.all(
    participants.map(async (p) => {
      const predictions = await getPredictions(p.id);
      const { total, games, bonuses } = calcTotalPoints(predictions, results, gamesPhaseMap);

      const groupPts = games
        .filter((g) => gamesPhaseMap[g.gameId] === "grupos")
        .reduce((s, g) => s + g.points, 0);
      const knockoutPts = games
        .filter((g) => gamesPhaseMap[g.gameId] !== "grupos")
        .reduce((s, g) => s + g.points, 0);

      return {
        id: p.id, name: p.name, total, groupPts, knockoutPts,
        bonusPts: bonuses.champion + bonuses.thirdPlace,
        champion: predictions.champion,
        thirdPlace: predictions.thirdPlace,
      };
    })
  );
  ranking.sort((a, b) => b.total - a.total);

  const prizes = calcPrizes(ranking);
  const gamesPlayed = Object.keys(results.groups).length + Object.keys(results.knockout).length;
  const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  // Posição densa: 100, 100, 80 → 1º, 1º, 2º
  const positions = ranking.map((_, i) => densePosition(ranking, i));

  function isTied(i: number): boolean {
    if (positions[i] > PRIZES_CENTS.length) return false;
    return ranking.filter((p) => p.total === ranking[i].total).length > 1;
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "#52b788" }}>
            Classificação Geral
          </p>
          <h1 className="text-3xl font-black" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
            Ranking
          </h1>
          <p className="text-sm mt-1" style={{ color: "#5a5a5a" }}>
            {gamesPlayed} de 104 jogos disputados
          </p>
        </div>
        <Link href="/" className="text-sm transition-colors hover:opacity-70" style={{ color: "#2d6a4f" }}>
          ← Início
        </Link>
      </div>

      {/* Tabela de prêmios */}
      <div className="rounded-[20px] border p-5" style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: "#5a5a5a" }}>
          Premiação
        </p>
        <div className="flex flex-wrap gap-3">
          {PRIZES_CENTS.map((v, i) => (
            <div key={i}
              className="flex items-center gap-2.5 rounded-[12px] px-4 py-2.5 border"
              style={{
                backgroundColor: i === 0 ? "rgba(201,168,76,0.08)" : "rgba(27,67,50,0.03)",
                borderColor: i === 0 ? "rgba(201,168,76,0.30)" : "rgba(27,67,50,0.08)",
              }}>
              <span className="text-lg">{["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#5a5a5a" }}>
                  {i + 1}º lugar
                </p>
                <p className="text-sm font-black" style={{ color: i === 0 ? "#8b7028" : "#1b4332" }}>
                  {formatBRL(v)}
                </p>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2.5 rounded-[12px] px-4 py-2.5 border"
            style={{ backgroundColor: "rgba(82,183,136,0.06)", borderColor: "rgba(82,183,136,0.20)" }}>
            <span className="text-lg">💰</span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#5a5a5a" }}>
                Total
              </p>
              <p className="text-sm font-black" style={{ color: "#1b4332" }}>
                {formatBRL(PRIZES_CENTS.reduce((s, v) => s + v, 0))}
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: "#9a9a9a" }}>
          Em caso de empate, o prêmio das colocações é dividido igualmente entre os empatados.
        </p>
      </div>

      {/* Live ranking */}
      <LiveRanking baseRanking={ranking.map((p) => ({ id: p.id, name: p.name, total: p.total }))} />

      {ranking.length === 0 ? (
        <div className="rounded-[20px] border border-dashed p-16 text-center"
          style={{ borderColor: "rgba(27,67,50,0.2)" }}>
          <div className="text-5xl mb-3">🏆</div>
          <p style={{ color: "#5a5a5a" }}>Nenhum participante cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 px-5 text-xs font-semibold uppercase tracking-wide"
            style={{ color: "#5a5a5a" }}>
            <div className="col-span-1">#</div>
            <div className="col-span-5 sm:col-span-3">Participante</div>
            <div className="col-span-2 text-center hidden sm:block">Grupos</div>
            <div className="col-span-2 text-center hidden sm:block">Mata-mata</div>
            <div className="col-span-2 text-center hidden sm:block">Bônus</div>
            <div className="col-span-6 sm:col-span-3 text-right">Total / Prêmio</div>
          </div>

          {ranking.map((p, i) => {
            const prize = prizes[i];
            const tied = isTied(i);
            const pos = positions[i];

            return (
              <Link key={p.id} href={`/palpites/${p.id}`}
                className="grid grid-cols-12 gap-2 items-center rounded-[16px] border px-5 py-4 transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{
                  backgroundColor: pos === 1 ? "rgba(201,168,76,0.06)" : "white",
                  borderColor: pos === 1 ? "rgba(201,168,76,0.35)"
                    : pos === 2 ? "rgba(160,160,170,0.25)"
                    : pos === 3 ? "rgba(180,120,60,0.20)"
                    : "rgba(27,67,50,0.08)",
                }}>

                <div className="col-span-1 text-xl font-bold">
                  {MEDAL[pos] ?? (
                    <span className="text-sm font-bold" style={{ color: "#5a5a5a" }}>{pos}º</span>
                  )}
                </div>

                <div className="col-span-5 sm:col-span-3">
                  <p className="font-bold text-sm leading-tight" style={{ color: "#1b4332" }}>{p.name}</p>
                  {p.champion && (
                    <p className="text-xs mt-0.5" style={{ color: "#c9a84c" }}>🏆 {p.champion}</p>
                  )}
                </div>

                <div className="col-span-2 text-center hidden sm:block text-sm font-semibold" style={{ color: "#5a5a5a" }}>
                  {p.groupPts}
                </div>
                <div className="col-span-2 text-center hidden sm:block text-sm font-semibold" style={{ color: "#5a5a5a" }}>
                  {p.knockoutPts}
                </div>
                <div className="col-span-2 text-center hidden sm:block text-sm font-semibold" style={{ color: "#c9a84c" }}>
                  {p.bonusPts > 0 ? `+${p.bonusPts}` : "—"}
                </div>

                <div className="col-span-6 sm:col-span-3 text-right">
                  <div>
                    <span className="text-2xl font-black" style={{ color: "#1b4332" }}>{p.total}</span>
                    <span className="text-xs ml-1" style={{ color: "#5a5a5a" }}>pts</span>
                  </div>
                  {prize !== null && (
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {tied && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: "rgba(234,179,8,0.15)", color: "#a16207" }}>
                          dividido
                        </span>
                      )}
                      <span className="text-sm font-bold" style={{ color: "#16a34a" }}>
                        {formatBRL(prize)}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="rounded-[16px] border p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm"
        style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
        <div className="flex gap-3 items-start">
          <span className="text-xl shrink-0">⚽</span>
          <div>
            <p className="font-semibold" style={{ color: "#1b4332" }}>Grupos</p>
            <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>Pontos dos 72 jogos da fase de grupos</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <span className="text-xl shrink-0">🏅</span>
          <div>
            <p className="font-semibold" style={{ color: "#1b4332" }}>Mata-Mata</p>
            <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>Pontos pelas fases eliminatórias</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <span className="text-xl shrink-0">🏆</span>
          <div>
            <p className="font-semibold" style={{ color: "#c9a84c" }}>Bônus</p>
            <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>Campeão (15 pts) + 3º lugar (10 pts)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
