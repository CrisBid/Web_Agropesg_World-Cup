import { getParticipants, getResults, getPredictions, getLiveScoreEnabled, getLiveAdminSettings, getLiveGameOverrides } from "@/lib/data";
import { calcTotalPoints } from "@/lib/scoring";
import { GAMES } from "@/lib/games-data";
import { getLiveMatches, computeBudget } from "@/lib/api-football";
import type { ActualResults } from "@/lib/scoring";
import type { Phase } from "@/lib/games-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const [enabled, adminSettings, gameOverrides] = await Promise.all([
    getLiveScoreEnabled(),
    getLiveAdminSettings(),
    getLiveGameOverrides(),
  ]);

  const budget = computeBudget(adminSettings.liveMaxReqPerGame);
  const testMode = adminSettings.liveBannerTestMode;

  // ── Test mode: fabricate a live ranking ───────────────────────────────────
  if (testMode === "live" || testMode === "post") {
    const [participants, finalResults] = await Promise.all([getParticipants(), getResults()]);
    const gamesPhaseMap: Record<number, Phase> = {};
    for (const g of GAMES) gamesPhaseMap[g.id] = g.phase;

    const baseRanking = await Promise.all(
      participants.map(async (p) => {
        const predictions = await getPredictions(p.id);
        const { total } = calcTotalPoints(predictions, finalResults, gamesPhaseMap);
        return { id: p.id, name: p.name, base: total };
      })
    );
    baseRanking.sort((a, b) => b.base - a.base);

    // Fabricate deltas: 1st gets +3, 2nd +2, 3rd +1, rest -1 (just for visual demo)
    const DEMO_DELTAS = [3, 2, 1, 0, -1, -1, -2];
    const ranking = baseRanking.map((p, i) => ({
      id: p.id,
      name: p.name,
      base: p.base,
      live: p.base + (DEMO_DELTAS[i] ?? -1),
      delta: DEMO_DELTAS[i] ?? -1,
    }));
    ranking.sort((a, b) => b.live - a.live);

    if (testMode === "post") {
      return Response.json({ live: false, postGame: true, ranking, clientPollMs: budget.clientPollMs });
    }
    return Response.json({ live: true, ranking, clientPollMs: budget.clientPollMs });
  }

  // ── Normal mode ──────────────────────────────────────────────────────────
  if (!enabled) {
    return Response.json({ live: false, disabled: true, ranking: [], clientPollMs: budget.clientPollMs });
  }

  const disabledGameIds = new Set(
    Object.entries(gameOverrides)
      .filter(([, v]) => !v.liveEnabled)
      .map(([k]) => Number(k))
  );

  const liveMatches = await getLiveMatches({
    reqPerGameOverride: adminSettings.liveMaxReqPerGame,
    disabledGameIds,
  });

  if (liveMatches.length === 0) {
    return Response.json({ live: false, ranking: [], clientPollMs: budget.clientPollMs });
  }

  const [participants, finalResults] = await Promise.all([getParticipants(), getResults()]);

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
