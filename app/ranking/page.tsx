import { getParticipants, getResults, getPredictions, getGroupGameStats, getEffectiveGames } from "@/lib/data";
import { calcTotalPoints } from "@/lib/scoring";
import { GAMES } from "@/lib/games-data";
import type { Phase } from "@/lib/games-data";
import Link from "next/link";
import type { RankingEntry } from "./RankingSection";
import type { TodayGameItem } from "./TodayGames";
import RankingPageClient from "./RankingPageClient";

function todayBRT(): string {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

export const dynamic = "force-dynamic";

const PRIZES_CENTS = [220000, 80000, 50000, 20000, 10000];

function densePosition(ranking: { total: number }[], i: number): number {
  return new Set(ranking.filter((p) => p.total > ranking[i].total).map((p) => p.total)).size + 1;
}

export default async function RankingPage() {
  const [participants, results, effectiveGames] = await Promise.all([getParticipants(), getResults(), getEffectiveGames()]);

  const gamesPhaseMap: Record<number, Phase> = {};
  for (const g of GAMES) gamesPhaseMap[g.id] = g.phase;

  const rawRanking = await Promise.all(
    participants.map(async (p) => {
      const predictions = await getPredictions(p.id);
      const { total, games, bonuses, classifyPts } = calcTotalPoints(predictions, results, gamesPhaseMap);
      return {
        id: p.id, name: p.name, total,
        groupPts: games.filter((g) => gamesPhaseMap[g.gameId] === "grupos").reduce((s, g) => s + g.points, 0),
        knockoutPts: classifyPts + games.filter((g) => gamesPhaseMap[g.gameId] !== "grupos").reduce((s, g) => s + g.points, 0),
        classifyPts,
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
  const todaysGames = effectiveGames.filter((g) => g.date.slice(0, 10) === today);

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

      {/* Jogos de Hoje + Premiação + Ranking (client — collapses Jogos/Premiação when live) */}
      <RankingPageClient todayItems={todayItems} entries={entries} />
    </div>
  );
}
