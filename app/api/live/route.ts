import { getLiveMatchesWithStats, isAnyGameExpectedLive, computeBudget } from "@/lib/api-football";
import { getLiveScoreEnabled, getLiveAdminSettings, getLiveGameOverrides } from "@/lib/data";

export async function GET() {
  const [enabled, adminSettings, gameOverrides] = await Promise.all([
    getLiveScoreEnabled(),
    getLiveAdminSettings(),
    getLiveGameOverrides(),
  ]);

  const budget = computeBudget(adminSettings.liveMaxReqPerGame);

  if (!enabled) {
    return Response.json(
      { matches: [], expected: false, disabled: true, budget },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  }

  if (!isAnyGameExpectedLive()) {
    return Response.json(
      { matches: [], expected: false, budget },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  }

  const disabledGameIds = new Set(
    Object.entries(gameOverrides)
      .filter(([, v]) => !v)
      .map(([k]) => Number(k))
  );

  const matches = await getLiveMatchesWithStats({
    reqPerGameOverride: adminSettings.liveMaxReqPerGame,
    statsEnabled: adminSettings.liveStatsEnabled,
    disabledGameIds,
  });

  return Response.json(
    {
      matches,
      expected: true,
      fetchedAt: new Date().toISOString(),
      budget,
    },
    { headers: { "Cache-Control": `public, max-age=${Math.floor(budget.liveTTL / 2000)}` } }
  );
}
