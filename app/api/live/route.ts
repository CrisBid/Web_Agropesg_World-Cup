import { getLiveMatchesWithStats, isAnyGameExpectedLive, computeBudget } from "@/lib/api-football";

export async function GET() {
  const budget = computeBudget();

  if (!isAnyGameExpectedLive()) {
    return Response.json(
      {
        matches: [],
        expected: false,
        budget,
      },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  }

  const matches = await getLiveMatchesWithStats();

  return Response.json(
    {
      matches,
      expected: true,
      fetchedAt: new Date().toISOString(),
      budget,
    },
    // Let browser cache for half the live TTL — prevents burst requests from multiple tabs
    { headers: { "Cache-Control": `public, max-age=${Math.floor(budget.liveTTL / 2000)}` } }
  );
}
