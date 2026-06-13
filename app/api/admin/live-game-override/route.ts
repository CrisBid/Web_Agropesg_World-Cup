import { setLiveGameOverride } from "@/lib/data";

export async function POST(req: Request) {
  const body = await req.json();
  const gameId = Number(body.gameId);

  if (!gameId || isNaN(gameId)) {
    return Response.json({ error: "Invalid gameId" }, { status: 400 });
  }

  const patch: { liveEnabled?: boolean; reqPerGame?: number | null } = {};

  if (typeof body.liveEnabled === "boolean") patch.liveEnabled = body.liveEnabled;
  if (body.reqPerGame === null) patch.reqPerGame = null;
  else if (typeof body.reqPerGame === "number") patch.reqPerGame = Math.min(92, Math.max(1, body.reqPerGame));

  await setLiveGameOverride(gameId, patch);
  return Response.json({ ok: true });
}
