"use client";

import { useState, useCallback } from "react";
import { GAMES, GROUPS, PHASE_LABELS, KNOCKOUT_GAME_PTS, FASE32_GROUPS, BRACKET, THIRD_PLACE_SLOTS } from "@/lib/games-data";
import type { Phase } from "@/lib/games-data";

const PHASES_ORDER: Phase[] = ["fase32", "oitavas", "quartas", "semis", "terceiro", "final"];
const KNOCKOUT_GAMES = GAMES.filter((g) => g.phase !== "grupos");
const GROUPS_ORDER = Object.keys(GROUPS).sort();

// All group-based slots: "1A".."1L", "2A".."2L" (24 total)
const GROUP_SLOTS: { slot: string; label: string }[] = GROUPS_ORDER.flatMap((grp) => [
  { slot: `1${grp}`, label: `1º Grupo ${grp}` },
  { slot: `2${grp}`, label: `2º Grupo ${grp}` },
]);

// 3rd-place slots keyed by which game they feed, in priority order
const THIRD_SLOTS: { slot: string; label: string }[] = THIRD_PLACE_SLOTS.map((gameId, i) => ({
  slot: `3rd_${gameId}`,
  label: `3º lugar #${i + 1} (→ Jogo ${gameId})`,
}));

interface Props {
  participantId: string;
  initialKnockout: Record<number, string | null>;
  initialClassification: Record<string, string>;
  derivedClassification: Record<string, string>;
  allTeams: string[];
  knockoutTeams: Record<number, { teamA: string; teamB: string }>;
  knockoutResults: Record<number, { winner: string; scoreA?: number; scoreB?: number }>;
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

function SelectRow({
  label,
  value,
  derived,
  teams,
  saving,
  onChange,
}: {
  label: string;
  value: string;
  derived?: string;
  teams: string[];
  saving?: boolean;
  onChange: (val: string | null) => void;
}) {
  const hasOverride = !!value;
  const displayValue = value || derived || "";
  const isDerived = !hasOverride && !!derived;
  const isConflict = hasOverride && !!derived && value !== derived;

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="text-xs font-semibold shrink-0 w-28 truncate" style={{ color: "#9a9a9a" }}>
        {label}
      </span>
      <div className="flex-1 min-w-0">
        <select
          value={displayValue}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full rounded-[10px] border px-3 py-2 text-sm outline-none"
          style={{
            backgroundColor: isConflict
              ? "rgba(234,179,8,0.07)"
              : displayValue ? "rgba(27,67,50,0.04)" : "#f7f5ef",
            borderColor: isConflict
              ? "rgba(234,179,8,0.5)"
              : displayValue ? "rgba(27,67,50,0.20)" : "rgba(27,67,50,0.12)",
            color: displayValue ? "#1b4332" : "#9a9a9a",
            fontWeight: displayValue ? 600 : 400,
            fontStyle: isDerived ? "italic" : "normal",
          }}>
          <option value="">— sem previsão —</option>
          {teams.map((team) => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>
        {isDerived && (
          <p className="text-[10px] mt-0.5 px-1" style={{ color: "#b0b0b0" }}>
            palpite (não salvo)
          </p>
        )}
        {isConflict && (
          <p className="text-[10px] mt-0.5 px-1" style={{ color: "#92400e" }}>
            ⚠️ palpite: {derived}
          </p>
        )}
      </div>
      <span className="text-xs w-10 text-right shrink-0 font-medium" style={{ color: "#aaa" }}>
        {saving ? "..." : ""}
      </span>
    </div>
  );
}

export default function BracketOverrideClient({
  participantId,
  initialKnockout,
  initialClassification,
  derivedClassification,
  allTeams,
  knockoutTeams,
  knockoutResults,
}: Props) {
  const [knockout, setKnockout] = useState<Record<number, string | null>>(initialKnockout);
  const [classification, setClassification] = useState<Record<string, string>>(initialClassification);
  const [knockoutStatus, setKnockoutStatus] = useState<Record<number, boolean>>({});
  const [classifStatus, setClassifStatus] = useState<Record<string, boolean>>({});

  const postAdmin = useCallback(
    async (body: object) => {
      await fetch(`/api/admin/palpites/${participantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    [participantId]
  );

  const setWinner = useCallback(
    async (gameId: number, winner: string | null) => {
      setKnockout((prev) => ({ ...prev, [gameId]: winner }));
      setKnockoutStatus((prev) => ({ ...prev, [gameId]: true }));
      await postAdmin({ gameId, winner });
      setKnockoutStatus((prev) => ({ ...prev, [gameId]: false }));
    },
    [postAdmin]
  );

  const setClassifSlot = useCallback(
    async (slot: string, team: string | null) => {
      setClassification((prev) => {
        const next = { ...prev };
        if (team) next[slot] = team; else delete next[slot];
        return next;
      });
      setClassifStatus((prev) => ({ ...prev, [slot]: true }));
      await postAdmin({ slot, team });
      setClassifStatus((prev) => ({ ...prev, [slot]: false }));
    },
    [postAdmin]
  );

  return (
    <div className="space-y-5">
      {/* Warning */}
      <div className="rounded-[16px] border px-5 py-4 flex items-start gap-3"
        style={{ backgroundColor: "rgba(234,179,8,0.06)", borderColor: "rgba(234,179,8,0.30)" }}>
        <span className="text-lg shrink-0">⚠️</span>
        <p className="text-sm" style={{ color: "#92400e" }}>
          As alterações aqui sobrescrevem diretamente os palpites do participante,
          ignorando as regras do bolão. Use com cuidado.
        </p>
      </div>

      {/* ── CLASSIFICAÇÃO PARA A FASE DE 32 ────────────────────────────────── */}
      <div className="rounded-[20px] border overflow-hidden"
        style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
        {/* Header */}
        <div className="px-6 py-3 flex items-center gap-3 border-b"
          style={{ backgroundColor: "rgba(27,67,50,0.025)", borderColor: "rgba(27,67,50,0.08)" }}>
          <h2 className="font-bold text-sm" style={{ color: "#1b4332" }}>
            Classificados para a Fase de 32
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#8b7028" }}>
            +3 pts por acerto
          </span>
        </div>

        {/* 1º e 2º de cada grupo */}
        <div className="px-6 pt-3 pb-1">
          <p className="text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: "#52b788" }}>
            1º e 2º de cada grupo
          </p>
        </div>
        <div>
          {GROUP_SLOTS.map((s, i) => (
            <div key={s.slot}
              style={{ borderTop: i > 0 ? "1px solid rgba(27,67,50,0.06)" : "none" }}>
              <SelectRow
                label={s.label}
                value={classification[s.slot] ?? ""}
                derived={derivedClassification[s.slot]}
                teams={allTeams}
                saving={classifStatus[s.slot]}
                onChange={(val) => setClassifSlot(s.slot, val)}
              />
            </div>
          ))}
        </div>

        {/* Melhores 3ºs */}
        <div className="px-6 pt-4 pb-1 border-t" style={{ borderColor: "rgba(27,67,50,0.08)" }}>
          <p className="text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: "#52b788" }}>
            Melhores 3ºs lugares (top 8)
          </p>
        </div>
        <div>
          {THIRD_SLOTS.map((s, i) => (
            <div key={s.slot}
              style={{ borderTop: i > 0 ? "1px solid rgba(27,67,50,0.06)" : "none" }}>
              <SelectRow
                label={s.label}
                value={classification[s.slot] ?? ""}
                derived={derivedClassification[s.slot]}
                teams={allTeams}
                saving={classifStatus[s.slot]}
                onChange={(val) => setClassifSlot(s.slot, val)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── VENCEDORES DO MATA-MATA ─────────────────────────────────────────── */}
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
                const saving = knockoutStatus[game.id];
                const hint = gameHint(game.id);
                const realTeams = knockoutTeams[game.id];
                const realResult = knockoutResults[game.id];

                return (
                  <div key={game.id}
                    style={{ borderTop: gi > 0 ? "1px solid rgba(27,67,50,0.06)" : "none" }}>
                    <div className="flex items-center gap-3 px-5 py-3">
                      {/* Game number */}
                      <span className="text-xs font-mono font-bold shrink-0 w-7 text-right"
                        style={{ color: "#aaa" }}>
                        #{game.id}
                      </span>

                      {/* Hint */}
                      {hint && (
                        <span className="text-xs hidden sm:block shrink-0 truncate max-w-[130px]"
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
                        {allTeams.map((team) => (
                          <option key={team} value={team}>{team}</option>
                        ))}
                      </select>

                      {/* Status */}
                      <span className="text-xs w-14 text-right shrink-0 font-medium"
                        style={{ color: "#aaa" }}>
                        {saving ? "..." : ""}
                      </span>
                    </div>

                    {/* Real bracket info */}
                    {realTeams && realTeams.teamA !== "TBD" && (
                      <div className="flex items-center gap-2 px-5 pb-2.5 -mt-1">
                        <span className="w-7 shrink-0" />
                        <span className="text-[11px] px-2 py-0.5 rounded"
                          style={{ backgroundColor: "rgba(27,67,50,0.05)", color: "#5a5a5a" }}>
                          Jogo real:&nbsp;
                          <span style={{ fontWeight: realResult?.winner === realTeams.teamA ? 700 : 400,
                            color: realResult?.winner === realTeams.teamA ? "#1b4332" : "inherit" }}>
                            {realTeams.teamA}
                          </span>
                          {realResult?.scoreA !== undefined
                            ? ` ${realResult.scoreA}×${realResult.scoreB} `
                            : " × "}
                          <span style={{ fontWeight: realResult?.winner === realTeams.teamB ? 700 : 400,
                            color: realResult?.winner === realTeams.teamB ? "#1b4332" : "inherit" }}>
                            {realTeams.teamB}
                          </span>
                          {realResult?.winner && (
                            <span style={{ color: "#2d6a4f", fontWeight: 600 }}>
                              &nbsp;→ {realResult.winner}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
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
