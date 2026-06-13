import { setLiveGameOverride } from "@/lib/data";

export async function POST(req: Request) {
  const body = await req.json();
  const gameId = Number(body.gameId);
  const enabled = Boolean(body.enabled);

  if (!gameId || isNaN(gameId)) {
    return Response.json({ error: "Invalid gameId" }, { status: 400 });
  }

  await setLiveGameOverride(gameId, enabled);
  return Response.json({ ok: true });
}
