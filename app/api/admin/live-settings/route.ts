import { getLiveAdminSettings, setLiveAdminSettings } from "@/lib/data";
import type { LiveBannerTestMode } from "@/lib/data";

export async function GET() {
  const settings = await getLiveAdminSettings();
  return Response.json(settings);
}

export async function POST(req: Request) {
  const body = await req.json();
  const patch: Parameters<typeof setLiveAdminSettings>[0] = {};

  if (typeof body.liveStatsEnabled === "boolean") patch.liveStatsEnabled = body.liveStatsEnabled;
  if (body.liveMaxReqPerGame === null) patch.liveMaxReqPerGame = null;
  else if (typeof body.liveMaxReqPerGame === "number") patch.liveMaxReqPerGame = body.liveMaxReqPerGame;

  const validTestModes: LiveBannerTestMode[] = ["pre", "live", "post", null];
  if (validTestModes.includes(body.liveBannerTestMode)) {
    patch.liveBannerTestMode = body.liveBannerTestMode as LiveBannerTestMode;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No valid fields" }, { status: 400 });
  }

  await setLiveAdminSettings(patch);
  return Response.json({ ok: true });
}
