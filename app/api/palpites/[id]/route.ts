import { getPredictions, savePredictions, getParticipants } from "@/lib/data";
import type { ParticipantPredictions } from "@/lib/scoring";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const participants = await getParticipants();
  if (!participants.find((p) => p.id === id)) {
    return Response.json({ error: "Participante não encontrado" }, { status: 404 });
  }
  const predictions = await getPredictions(id);
  return Response.json(predictions);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const participants = await getParticipants();
  const participant = participants.find((p) => p.id === id);
  if (!participant) {
    return Response.json({ error: "Participante não encontrado" }, { status: 404 });
  }
  if (participant.lockedAt) {
    return Response.json({ error: "Apostas bloqueadas" }, { status: 403 });
  }
  const data = (await request.json()) as ParticipantPredictions;
  await savePredictions(id, data);
  return Response.json({ ok: true });
}
