import { getResults, saveResults } from "@/lib/data";
import type { ActualResults } from "@/lib/scoring";

export async function GET() {
  return Response.json(await getResults());
}

export async function POST(request: Request) {
  const data = (await request.json()) as ActualResults;
  await saveResults(data);
  return Response.json({ ok: true });
}
