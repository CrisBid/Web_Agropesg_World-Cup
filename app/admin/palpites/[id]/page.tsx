import { getParticipants, getResults } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { ALL_TEAMS } from "@/lib/games-data";
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
  const [participants, knockoutRows, classificationRows, results] = await Promise.all([
    getParticipants(),
    prisma.knockoutPrediction.findMany({ where: { participantId: id } }),
    prisma.classificationOverride.findMany({ where: { participantId: id } }),
    getResults(),
  ]);

  const participant = participants.find((p) => p.id === id);
  if (!participant) notFound();

  const initialKnockout: Record<number, string | null> = {};
  for (const r of knockoutRows) initialKnockout[r.gameId] = r.winner ?? null;

  const initialClassification: Record<string, string> = {};
  for (const r of classificationRows) initialClassification[r.slot] = r.team;

  // Build extended team list: ALL_TEAMS + any team in the real bracket that uses
  // a different name (e.g. admin entered a corrected/updated team name).
  const baseSet = new Set(ALL_TEAMS);
  const extra = new Set<string>();
  for (const t of Object.values(results.knockoutTeams ?? {})) {
    if (t.teamA && t.teamA !== "TBD") extra.add(t.teamA);
    if (t.teamB && t.teamB !== "TBD") extra.add(t.teamB);
  }
  for (const r of Object.values(results.knockout)) {
    if (r.winner) extra.add(r.winner);
  }
  const allTeams = [
    ...ALL_TEAMS,
    ...[...extra].filter((t) => !baseSet.has(t)),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

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
        initialClassification={initialClassification}
        allTeams={allTeams}
        knockoutTeams={results.knockoutTeams ?? {}}
        knockoutResults={results.knockout}
      />
    </div>
  );
}
