import { cookies } from "next/headers";
import { getParticipants } from "@/lib/data";

export async function GET() {
  const jar = await cookies();
  const uid = jar.get("bolao_uid")?.value;
  if (!uid) return Response.json(null);

  const participants = await getParticipants();
  const participant = participants.find((p) => p.id === uid);
  if (!participant) return Response.json(null);

  return Response.json({ id: participant.id, name: participant.name });
}
