import { getLiveMatchesWithStats, isAnyGameExpectedLive, computeBudget } from "@/lib/api-football";
import { getLiveScoreEnabled, getLiveAdminSettings, getLiveGameOverrides } from "@/lib/data";
import { GAMES } from "@/lib/games-data";

const PRE_WINDOW_MS = 30 * 60_000; // show banner 30 min before kickoff

// ─── Upcoming games (next 30 min) ─────────────────────────────────────────

function getUpcomingGames() {
  const now = Date.now();
  return GAMES
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

const FAKE_KICKOFF_OFFSET = 20 * 60_000; // 20 min from now for pre-game test

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

export async function GET() {
  const [enabled, adminSettings, gameOverrides] = await Promise.all([
    getLiveScoreEnabled(),
    getLiveAdminSettings(),
    getLiveGameOverrides(),
  ]);

  const budget = computeBudget(adminSettings.liveMaxReqPerGame);
  const testMode = adminSettings.liveBannerTestMode;

  // ── Test mode ──
  if (testMode === "pre") {
    return Response.json({
      matches: [],
      upcoming: [fakePreData()],
      expected: false,
      budget,
      testMode: "pre",
    });
  }
  if (testMode === "live") {
    return Response.json({
      matches: [fakeLiveMatch("2H")],
      upcoming: [],
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
      expected: false,
      fetchedAt: new Date().toISOString(),
      budget,
      testMode: "post",
    });
  }

  // ── Normal mode ──
  const upcoming = getUpcomingGames();

  if (!enabled) {
    return Response.json(
      { matches: [], upcoming: [], expected: false, disabled: true, budget },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  }

  if (!isAnyGameExpectedLive() && upcoming.length === 0) {
    return Response.json(
      { matches: [], upcoming, expected: false, budget },
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

  return Response.json(
    {
      matches,
      upcoming: upcoming.filter((u) => !disabledGameIds.has(u.gameId)),
      expected: true,
      fetchedAt: new Date().toISOString(),
      budget,
    },
    { headers: { "Cache-Control": `public, max-age=${Math.floor(budget.liveTTL / 2000)}` } }
  );
}
