import { prisma } from "@/lib/prisma";
import { getParticipants } from "@/lib/data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const participants = await getParticipants();
  if (!participants.find((p) => p.id === id)) {
    return Response.json({ error: "Participante não encontrado" }, { status: 404 });
  }
  const rows = await prisma.knockoutPrediction.findMany({ where: { participantId: id } });
  const knockout: Record<number, string | null> = {};
  for (const r of rows) knockout[r.gameId] = r.winner ?? null;
  return Response.json({ knockout });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const participants = await getParticipants();
  if (!participants.find((p) => p.id === id)) {
    return Response.json({ error: "Participante não encontrado" }, { status: 404 });
  }

  const body = (await req.json()) as
    | { gameId: number; winner: string | null }
    | { slot: string; team: string | null };

  if ("slot" in body) {
    const { slot, team } = body;
    if (!team) {
      await prisma.classificationOverride.deleteMany({ where: { participantId: id, slot } });
    } else {
      await prisma.classificationOverride.upsert({
        where: { participantId_slot: { participantId: id, slot } },
        update: { team },
        create: { participantId: id, slot, team },
      });
    }
  } else {
    const { gameId, winner } = body;
    if (!winner) {
      await prisma.knockoutPrediction.updateMany({
        where: { participantId: id, gameId },
        data: { winner: null },
      });
    } else {
      await prisma.knockoutPrediction.upsert({
        where: { participantId_gameId: { participantId: id, gameId } },
        update: { winner },
        create: { participantId: id, gameId, winner, scoreA: null, scoreB: null },
      });
    }
  }

  return Response.json({ ok: true });
}
