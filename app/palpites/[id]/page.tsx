import { getParticipants, getResults, getPredictions } from "@/lib/data";
import { calcTotalPoints } from "@/lib/scoring";
import { GAMES } from "@/lib/games-data";
import type { Phase } from "@/lib/games-data";
import { notFound } from "next/navigation";
import PalpitesForm from "./PalpitesForm";

export const dynamic = "force-dynamic";

export default async function PalpitesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [participants, results] = await Promise.all([getParticipants(), getResults()]);
  const participant = participants.find((p) => p.id === id);
  if (!participant) notFound();

  const predictions = await getPredictions(id);

  const gamesPhaseMap: Record<number, Phase> = {};
  for (const g of GAMES) gamesPhaseMap[g.id] = g.phase;

  const { total, games: gamePoints, bonuses } = calcTotalPoints(predictions, results, gamesPhaseMap);

  const pointsByGame: Record<number, number> = {};
  for (const gp of gamePoints) pointsByGame[gp.gameId] = gp.points;

  const gamesPlayed = Object.keys(results.groups).length + Object.keys(results.knockout).length;

  return (
    <div className="space-y-8">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-[24px] p-8"
        style={{ backgroundColor: "#1b4332" }}>
        <div className="blob w-48 h-48 -top-12 -right-12" style={{ backgroundColor: "rgba(82,183,136,0.25)" }} />
        <div className="blob w-36 h-36 -bottom-10 -left-10" style={{ backgroundColor: "rgba(201,168,76,0.20)" }} />

        <div className="relative z-10 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-2"
              style={{ color: "rgba(82,183,136,0.9)" }}>
              Palpites · Copa 2026
            </p>
            <h1 className="text-3xl font-black text-white leading-tight"
              style={{ fontFamily: "var(--font-playfair)" }}>
              {participant.name}
            </h1>
            {participant.lockedAt && (
              <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: "rgba(220,38,38,0.20)", color: "#fca5a5" }}>
                🔒 Apostas bloqueadas
              </span>
            )}

            <div className="flex flex-wrap gap-3 mt-3">
              {bonuses.champion > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: "rgba(201,168,76,0.25)", color: "#fbbf24" }}>
                  🏆 Campeão: +{bonuses.champion} pts
                </span>
              )}
              {bonuses.thirdPlace > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: "rgba(201,168,76,0.18)", color: "#fbbf24" }}>
                  🥉 3º lugar: +{bonuses.thirdPlace} pts
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="text-5xl font-black text-white">{total}</p>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>pontos totais</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              {gamesPlayed}/104 jogos disputados
            </p>
          </div>
        </div>
      </div>

      <PalpitesForm
        participantId={id}
        participantName={participant.name}
        initialPredictions={predictions}
        results={results}
        pointsByGame={pointsByGame}
        locked={!!participant.lockedAt}
      />
    </div>
  );
}
