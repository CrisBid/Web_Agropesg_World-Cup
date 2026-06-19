import { NextRequest, NextResponse } from "next/server";
import { getGameScheduleOverrides, saveGameScheduleOverride, deleteGameScheduleOverride } from "@/lib/data";

export async function GET() {
  const overrides = await getGameScheduleOverrides();
  return NextResponse.json(overrides);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { gameId, date, stadium, teamA, teamB, reset } = body;

  if (!gameId || typeof gameId !== "number") {
    return NextResponse.json({ error: "gameId inválido" }, { status: 400 });
  }

  if (reset) {
    await deleteGameScheduleOverride(gameId);
    return NextResponse.json({ ok: true });
  }

  await saveGameScheduleOverride(gameId, {
    date: date ?? null,
    stadium: stadium ?? null,
    teamA: teamA ?? null,
    teamB: teamB ?? null,
  });

  return NextResponse.json({ ok: true });
}
