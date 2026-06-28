import { getResults, saveKnockoutTeams } from "@/lib/data";
import { computeFase32Bracket } from "@/lib/bracket";

export async function POST() {
  const results = await getResults();
  const bracket = computeFase32Bracket(results.groups);
  await saveKnockoutTeams(bracket);
  return Response.json({ ok: true, bracket });
}
