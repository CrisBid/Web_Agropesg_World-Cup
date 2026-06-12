import { getParticipants, getResults, getPredictions } from "@/lib/data";
import { calcTotalPoints } from "@/lib/scoring";
import { GAMES } from "@/lib/games-data";
import { getLiveMatches, computeBudget } from "@/lib/api-football";
import type { ActualResults } from "@/lib/scoring";
import type { Phase } from "@/lib/games-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const budget = computeBudget();
  const liveMatches = await getLiveMatches();

  if (liveMatches.length === 0) {
    return Response.json({ live: false, ranking: [], clientPollMs: budget.clientPollMs });
  }

  const [participants, finalResults] = await Promise.all([getParticipants(), getResults()]);

  // Build merged results: finalized + live overlay (treated as if already final)
  const merged: ActualResults = {
    ...finalResults,
    groups:   { ...finalResults.groups },
    knockout: { ...finalResults.knockout },
  };

  const liveGameIds = new Set<number>();

  for (const m of liveMatches) {
    if (m.gameId === null) continue;
    const game = GAMES.find((g) => g.id === m.gameId);
    if (!game) continue;
    liveGameIds.add(m.gameId);

    if (game.phase === "grupos") {
      merged.groups[m.gameId] = { scoreA: m.homeGoals, scoreB: m.awayGoals };
    } else {
      let winner: string | undefined;
      if (m.homeGoals > m.awayGoals) winner = m.homeTeam;
      else if (m.awayGoals > m.homeGoals) winner = m.awayTeam;
      if (winner) {
        merged.knockout[m.gameId] = { scoreA: m.homeGoals, scoreB: m.awayGoals, winner };
      }
    }
  }

  const gamesPhaseMap: Record<number, Phase> = {};
  for (const g of GAMES) gamesPhaseMap[g.id] = g.phase;

  const ranking = await Promise.all(
    participants.map(async (p) => {
      const predictions = await getPredictions(p.id);
      const { total: base } = calcTotalPoints(predictions, finalResults, gamesPhaseMap);
      const { total: live } = calcTotalPoints(predictions, merged, gamesPhaseMap);
      return { id: p.id, name: p.name, base, live, delta: live - base };
    })
  );

  ranking.sort((a, b) => b.live - a.live);

  return Response.json({
    live: true,
    liveGameIds: Array.from(liveGameIds),
    ranking,
    clientPollMs: budget.clientPollMs,
  });
}
