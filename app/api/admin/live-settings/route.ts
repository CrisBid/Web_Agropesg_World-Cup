import { getLiveAdminSettings, setLiveAdminSettings } from "@/lib/data";

export async function GET() {
  const settings = await getLiveAdminSettings();
  return Response.json(settings);
}

export async function POST(req: Request) {
  const body = await req.json();
  const liveStatsEnabled = typeof body.liveStatsEnabled === "boolean" ? body.liveStatsEnabled : undefined;
  const liveMaxReqPerGame =
    body.liveMaxReqPerGame === null ? null
    : typeof body.liveMaxReqPerGame === "number" ? body.liveMaxReqPerGame
    : undefined;

  if (liveStatsEnabled === undefined && liveMaxReqPerGame === undefined) {
    return Response.json({ error: "No valid fields" }, { status: 400 });
  }

  const current = await getLiveAdminSettings();
  await setLiveAdminSettings({
    liveStatsEnabled: liveStatsEnabled ?? current.liveStatsEnabled,
    liveMaxReqPerGame: liveMaxReqPerGame !== undefined ? liveMaxReqPerGame : current.liveMaxReqPerGame,
  });

  return Response.json({ ok: true });
}
