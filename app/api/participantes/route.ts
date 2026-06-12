import { addParticipant, getParticipants, removeParticipant, setParticipantLocked, setParticipantAdmin } from "@/lib/data";

export async function GET() {
  const participants = await getParticipants();
  return Response.json(participants);
}

export async function POST(request: Request) {
  const { name, phone } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Nome inválido" }, { status: 400 });
  }
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits || digits.length < 8) {
    return Response.json({ error: "Telefone inválido (mínimo 8 dígitos)" }, { status: 400 });
  }
  const existing = await getParticipants();
  if (existing.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())) {
    return Response.json({ error: "Nome já cadastrado" }, { status: 400 });
  }
  if (existing.some((p) => p.phone === digits)) {
    return Response.json({ error: "Telefone já cadastrado" }, { status: 400 });
  }
  const participant = await addParticipant(name, digits);
  return Response.json(participant, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id } = body;
  if (!id) return Response.json({ error: "ID inválido" }, { status: 400 });
  if ("locked" in body) await setParticipantLocked(String(id), Boolean(body.locked));
  if ("isAdmin" in body) await setParticipantAdmin(String(id), Boolean(body.isAdmin));
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id) return Response.json({ error: "ID inválido" }, { status: 400 });
  await removeParticipant(String(id));
  return Response.json({ ok: true });
}
