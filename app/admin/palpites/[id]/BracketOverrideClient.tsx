"use client";

import { useState, useCallback } from "react";
import { GAMES, PHASE_LABELS, ALL_TEAMS, KNOCKOUT_GAME_PTS, FASE32_GROUPS, BRACKET } from "@/lib/games-data";
import type { Phase } from "@/lib/games-data";

const PHASES_ORDER: Phase[] = ["fase32", "oitavas", "quartas", "semis", "terceiro", "final"];
const KNOCKOUT_GAMES = GAMES.filter((g) => g.phase !== "grupos");

interface Props {
  participantId: string;
  initialKnockout: Record<number, string | null>;
}

function gameHint(gameId: number): string {
  const codes = FASE32_GROUPS[gameId];
  if (codes) {
    const fmt = (c: string) =>
      c === "3rd" ? "Mel. 3º" : c[0] === "1" ? `1º Gr.${c[1]}` : `2º Gr.${c[1]}`;
    return `${fmt(codes[0])} × ${fmt(codes[1])}`;
  }
  if (gameId === 103) return "Perdedores das semifinais";
  const feeders = BRACKET[gameId];
  if (feeders) return `Venc. #${feeders[0]} × Venc. #${feeders[1]}`;
  return "";
}

export default function BracketOverrideClient({ participantId, initialKnockout }: Props) {
  const [knockout, setKnockout] = useState<Record<number, string | null>>(initialKnockout);
  const [status, setStatus] = useState<Record<number, "saving" | "saved" | null>>({});

  const setWinner = useCallback(
    async (gameId: number, winner: string | null) => {
      setKnockout((prev) => ({ ...prev, [gameId]: winner }));
      setStatus((prev) => ({ ...prev, [gameId]: "saving" }));

      await fetch(`/api/admin/palpites/${participantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, winner }),
      });

      setStatus((prev) => ({ ...prev, [gameId]: "saved" }));
      setTimeout(() => setStatus((prev) => ({ ...prev, [gameId]: null })), 1500);
    },
    [participantId]
  );

  return (
    <div className="space-y-5">
      <div className="rounded-[16px] border px-5 py-4 flex items-start gap-3"
        style={{ backgroundColor: "rgba(234,179,8,0.06)", borderColor: "rgba(234,179,8,0.30)" }}>
        <span className="text-lg shrink-0">⚠️</span>
        <p className="text-sm" style={{ color: "#92400e" }}>
          As alterações aqui sobrescrevem diretamente os palpites do participante no mata-mata,
          ignorando as regras do bolão. Use com cuidado.
        </p>
      </div>

      {PHASES_ORDER.map((phase) => {
        const games = KNOCKOUT_GAMES.filter((g) => g.phase === phase);
        if (games.length === 0) return null;
        const pts = KNOCKOUT_GAME_PTS[phase];

        return (
          <div key={phase} className="rounded-[20px] border overflow-hidden"
            style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
            {/* Phase header */}
            <div className="px-6 py-3 flex items-center gap-3 border-b"
              style={{ backgroundColor: "rgba(27,67,50,0.025)", borderColor: "rgba(27,67,50,0.08)" }}>
              <h2 className="font-bold text-sm" style={{ color: "#1b4332" }}>
                {PHASE_LABELS[phase]}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#8b7028" }}>
                +{pts} pts por acerto
              </span>
            </div>

            {/* Games */}
            <div>
              {games.map((game, gi) => {
                const current = knockout[game.id] ?? null;
                const st = status[game.id];
                const hint = gameHint(game.id);

                return (
                  <div key={game.id}
                    className="flex items-center gap-3 px-5 py-3"
                    style={{ borderTop: gi > 0 ? "1px solid rgba(27,67,50,0.06)" : "none" }}>
                    {/* Game number */}
                    <span className="text-xs font-mono font-bold shrink-0 w-7 text-right"
                      style={{ color: "#aaa" }}>
                      #{game.id}
                    </span>

                    {/* Hint */}
                    {hint && (
                      <span className="text-xs hidden sm:block shrink-0 truncate max-w-[160px]"
                        style={{ color: "#9a9a9a" }}>
                        {hint}
                      </span>
                    )}

                    {/* Team selector */}
                    <select
                      value={current ?? ""}
                      onChange={(e) => setWinner(game.id, e.target.value || null)}
                      className="flex-1 rounded-[10px] border px-3 py-2 text-sm outline-none"
                      style={{
                        backgroundColor: current ? "rgba(27,67,50,0.04)" : "#f7f5ef",
                        borderColor: current ? "rgba(27,67,50,0.25)" : "rgba(27,67,50,0.12)",
                        color: current ? "#1b4332" : "#9a9a9a",
                        fontWeight: current ? 600 : 400,
                      }}>
                      <option value="">— sem previsão —</option>
                      {ALL_TEAMS.map((team) => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                    </select>

                    {/* Status */}
                    <span className="text-xs w-14 text-right shrink-0 font-medium"
                      style={{ color: st === "saved" ? "#16a34a" : "#aaa" }}>
                      {st === "saving" ? "..." : st === "saved" ? "Salvo ✓" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
