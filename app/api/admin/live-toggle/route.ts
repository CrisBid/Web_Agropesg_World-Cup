import { getLiveScoreEnabled, setLiveScoreEnabled } from "@/lib/data";

export async function GET() {
  const enabled = await getLiveScoreEnabled();
  return Response.json({ enabled });
}

export async function POST(req: Request) {
  const { enabled } = await req.json();
  if (typeof enabled !== "boolean") {
    return Response.json({ error: "Campo 'enabled' deve ser boolean" }, { status: 400 });
  }
  await setLiveScoreEnabled(enabled);
  return Response.json({ enabled });
}
