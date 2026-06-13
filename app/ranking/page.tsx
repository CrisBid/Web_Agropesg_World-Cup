import { getParticipants, getResults, getPredictions, getGroupGameStats } from "@/lib/data";
import { calcTotalPoints } from "@/lib/scoring";
import { GAMES } from "@/lib/games-data";
import type { Phase } from "@/lib/games-data";
import Link from "next/link";
import RankingSection, { type RankingEntry } from "./RankingSection";
import TodayGames from "./TodayGames";
import type { TodayGameItem } from "./TodayGames";

function todayBRT(): string {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

export const dynamic = "force-dynamic";

const PRIZES_CENTS = [220000, 80000, 50000, 20000, 10000];

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function densePosition(ranking: { total: number }[], i: number): number {
  return new Set(ranking.filter((p) => p.total > ranking[i].total).map((p) => p.total)).size + 1;
}

export default async function RankingPage() {
  const [participants, results] = await Promise.all([getParticipants(), getResults()]);

  const gamesPhaseMap: Record<number, Phase> = {};
  for (const g of GAMES) gamesPhaseMap[g.id] = g.phase;

  const rawRanking = await Promise.all(
    participants.map(async (p) => {
      const predictions = await getPredictions(p.id);
      const { total, games, bonuses } = calcTotalPoints(predictions, results, gamesPhaseMap);
      return {
        id: p.id, name: p.name, total,
        groupPts: games.filter((g) => gamesPhaseMap[g.gameId] === "grupos").reduce((s, g) => s + g.points, 0),
        knockoutPts: games.filter((g) => gamesPhaseMap[g.gameId] !== "grupos").reduce((s, g) => s + g.points, 0),
        bonusPts: bonuses.champion + bonuses.thirdPlace,
        champion: predictions.champion,
      };
    })
  );
  rawRanking.sort((a, b) => b.total - a.total);

  const entries: RankingEntry[] = rawRanking.map((p, i, arr) => {
    const pos = densePosition(arr, i);
    const tiedCount = arr.filter((x) => x.total === p.total).length;
    const prize = pos <= PRIZES_CENTS.length ? Math.round(PRIZES_CENTS[pos - 1] / tiedCount) : null;
    return { ...p, pos, prize, tied: tiedCount > 1 };
  });

  const gamesPlayed = Object.keys(results.groups).length + Object.keys(results.knockout).length;
  const today = todayBRT();
  const todaysGames = GAMES.filter((g) => g.date.slice(0, 10) === today);

  const todayItems: TodayGameItem[] = await Promise.all(
    todaysGames.map(async (g) => {
      const stats = g.phase === "grupos" ? await getGroupGameStats(g.id) : { total: 0, homeWins: 0, draws: 0, awayWins: 0, topScores: [], othersCount: 0 };
      const result = g.phase === "grupos" ? results.groups[g.id] : results.knockout[g.id];
      return { game: g, result: result ?? null, stats };
    })
  );

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

      {/* Jogos do dia */}
      <TodayGames items={todayItems} />

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

      {/* Ranking com live + acordeão */}
      <RankingSection entries={entries} />
    </div>
  );
}
