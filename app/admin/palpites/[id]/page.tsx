import { getParticipants } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import BracketOverrideClient from "./BracketOverrideClient";

export const dynamic = "force-dynamic";

export default async function AdminBracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [participants, rows] = await Promise.all([
    getParticipants(),
    prisma.knockoutPrediction.findMany({ where: { participantId: id } }),
  ]);

  const participant = participants.find((p) => p.id === id);
  if (!participant) notFound();

  const initialKnockout: Record<number, string | null> = {};
  for (const r of rows) initialKnockout[r.gameId] = r.winner ?? null;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-1"
            style={{ color: "#52b788" }}>
            Admin · Mata-mata
          </p>
          <h1 className="text-3xl font-black" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
            {participant.name}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#5a5a5a" }}>
            Definir manualmente quem avança em cada posição, ignorando as regras do bolão.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Link href="/admin/participantes"
            className="text-sm transition-colors hover:opacity-70"
            style={{ color: "#2d6a4f" }}>
            ← Participantes
          </Link>
          <Link href={`/palpites/${id}`} target="_blank"
            className="text-xs transition-colors hover:opacity-70"
            style={{ color: "#52b788" }}>
            Ver palpites ↗
          </Link>
        </div>
      </div>

      <BracketOverrideClient
        participantId={id}
        initialKnockout={initialKnockout}
      />
    </div>
  );
}
