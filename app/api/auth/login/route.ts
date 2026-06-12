import { findByPhone } from "@/lib/data";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const { phone } = await request.json();
  if (!phone) {
    return Response.json({ error: "Telefone obrigatório" }, { status: 400 });
  }

  const participant = await findByPhone(String(phone));
  if (!participant) {
    return Response.json({ error: "Número não encontrado. Verifique com o admin do bolão." }, { status: 404 });
  }

  const jar = await cookies();
  jar.set("bolao_uid", participant.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });

  return Response.json({ id: participant.id, name: participant.name });
}
