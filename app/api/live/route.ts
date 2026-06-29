import { getLiveMatchesWithStats, isAnyGameExpectedLive, computeBudget } from "@/lib/api-football";
import { getLiveScoreEnabled, getLiveAdminSettings, getLiveGameOverrides, getGroupGameStats, getKnockoutGameStats, getPredictions, getEffectiveGames } from "@/lib/data";
import { GAMES } from "@/lib/games-data";
import type { GamePredictionStats } from "@/lib/data";

const PRE_WINDOW_MS = 30 * 60_000;

// ─── Upcoming games ────────────────────────────────────────────────────────

async function getUpcomingGames() {
  const games = await getEffectiveGames();
  const now = Date.now();
  return games
    .filter((g) => {
      const kickoff = new Date(g.date + ":00-03:00").getTime();
      return kickoff > now && kickoff - now <= PRE_WINDOW_MS;
    })
    .map((g) => ({
      gameId: g.id,
      teamA: g.teamA,
      teamB: g.teamB,
      phase: g.phase,
      group: g.group,
      kickoffMs: new Date(g.date + ":00-03:00").getTime(),
    }));
}

// ─── Fake data for test modes ──────────────────────────────────────────────

const FAKE_KICKOFF_OFFSET = 20 * 60_000;

function fakePreData() {
  return {
    gameId: 9999,
    teamA: "Teste Time A",
    teamB: "Teste Time B",
    phase: "grupos",
    group: "A",
    kickoffMs: Date.now() + FAKE_KICKOFF_OFFSET,
  };
}

const FAKE_PRED_STATS: GamePredictionStats = {
  total: 17,
  homeWins: 9,
  draws: 4,
  awayWins: 4,
  topScores: [],
  othersCount: 0,
};

function fakeLiveMatch(status: "2H" | "FT") {
  return {
    fixtureId: 99999,
    homeTeam: "Teste Time A",
    awayTeam: "Teste Time B",
    homeGoals: 2,
    awayGoals: 1,
    elapsed: status === "FT" ? 90 : 67,
    status,
    statusLabel: status === "FT" ? "Encerrado" : "2º Tempo",
    gameId: null,
    events: [
      { elapsed: 15, extraTime: null, teamPortuguese: "Teste Time A", player: "Jogador 7", type: "Gol" as const },
      { elapsed: 34, extraTime: null, teamPortuguese: "Teste Time B", player: "Jogador 10", type: "Gol" as const },
      { elapsed: 58, extraTime: null, teamPortuguese: "Teste Time A", player: "Jogador 9", type: "Pênalti" as const },
    ],
    stats: {
      possession:    { home: 55, away: 45 },
      totalShots:    { home: 14, away: 8  },
      shotsOnTarget: { home: 6,  away: 3  },
      corners:       { home: 7,  away: 4  },
      fouls:         { home: 9,  away: 12 },
      yellowCards:   { home: 1,  away: 2  },
      redCards:      { home: 0,  away: 0  },
      saves:         { home: 3,  away: 5  },
    },
  };
}

// ─── Route ────────────────────────────────────────────────────────────────

async function buildUserPredictions(uid: string): Promise<Record<number, string>> {
  try {
    const preds = await getPredictions(uid);
    const map: Record<number, string> = {};
    for (const [gameIdStr, p] of Object.entries(preds.groups)) {
      if (p.scoreA !== null && p.scoreB !== null)
        map[Number(gameIdStr)] = `${p.scoreA}–${p.scoreB}`;
    }
    for (const [gameIdStr, p] of Object.entries(preds.knockout)) {
      if (p.winner) map[Number(gameIdStr)] = p.winner;
    }
    return map;
  } catch {
    return {};
  }
}

export async function GET(req: Request) {
  const uid = new URL(req.url).searchParams.get("uid") ?? null;

  const [enabled, adminSettings, gameOverrides] = await Promise.all([
    getLiveScoreEnabled(),
    getLiveAdminSettings(),
    getLiveGameOverrides(),
  ]);

  const budget = computeBudget(adminSettings.liveMaxReqPerGame);
  const testMode = adminSettings.liveBannerTestMode;

  const userPredictions = uid ? await buildUserPredictions(uid) : {};

  // ── Test mode ──
  if (testMode === "pre") {
    return Response.json({
      matches: [],
      upcoming: [fakePreData()],
      predStats: {},
      userPredictions,
      expected: false,
      budget,
      testMode: "pre",
    });
  }
  if (testMode === "live") {
    return Response.json({
      matches: [fakeLiveMatch("2H")],
      upcoming: [],
      predStats: { 99999: FAKE_PRED_STATS },
      userPredictions,
      expected: true,
      fetchedAt: new Date().toISOString(),
      budget,
      testMode: "live",
    });
  }
  if (testMode === "post") {
    return Response.json({
      matches: [fakeLiveMatch("FT")],
      upcoming: [],
      predStats: { 99999: FAKE_PRED_STATS },
      userPredictions,
      expected: false,
      fetchedAt: new Date().toISOString(),
      budget,
      testMode: "post",
    });
  }

  // ── Normal mode ──
  const upcoming = await getUpcomingGames();

  if (!enabled) {
    return Response.json(
      { matches: [], upcoming: [], predStats: {}, userPredictions, expected: false, disabled: true, budget },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  }

  if (!isAnyGameExpectedLive() && upcoming.length === 0) {
    return Response.json(
      { matches: [], upcoming, predStats: {}, userPredictions, expected: false, budget },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  }

  const disabledGameIds = new Set(
    Object.entries(gameOverrides)
      .filter(([, v]) => !v.liveEnabled)
      .map(([k]) => Number(k))
  );

  const perGameReqOverrides: Record<number, number> = {};
  for (const [gameIdStr, entry] of Object.entries(gameOverrides)) {
    if (entry.reqPerGame != null) perGameReqOverrides[Number(gameIdStr)] = entry.reqPerGame;
  }

  const matches = await getLiveMatchesWithStats({
    reqPerGameOverride: adminSettings.liveMaxReqPerGame,
    statsEnabled: adminSettings.liveStatsEnabled,
    disabledGameIds,
    perGameReqOverrides,
  });

  // Fetch prediction stats for live group games
  const predStats: Record<number, GamePredictionStats> = {};
  await Promise.all(
    matches
      .filter((m) => m.gameId !== null)
      .map(async (m) => {
        const game = GAMES.find((g) => g.id === m.gameId);
        if (!game) return;
        const effectiveGame = games.find((g) => g.id === m.gameId);
        const s = game.phase === "grupos"
          ? await getGroupGameStats(m.gameId!)
          : await getKnockoutGameStats(m.gameId!, effectiveGame?.teamA ?? game.teamA, effectiveGame?.teamB ?? game.teamB);
        predStats[m.fixtureId] = s;
      })
  );

  return Response.json(
    {
      matches,
      upcoming: upcoming.filter((u) => !disabledGameIds.has(u.gameId)),
      predStats,
      userPredictions,
      expected: true,
      fetchedAt: new Date().toISOString(),
      budget,
    },
    { headers: { "Cache-Control": `public, max-age=${Math.floor(budget.liveTTL / 2000)}` } }
  );
}
