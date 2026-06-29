"use client";

import { useState } from "react";
import type { Game } from "@/lib/games-data";
import { PHASE_LABELS } from "@/lib/games-data";
import type { GamePredictionStats } from "@/lib/data";

export interface TodayGameItem {
  game: Game;
  result?: { scoreA?: number | null; scoreB?: number | null; winner?: string } | null;
  stats: GamePredictionStats;
}

interface Props {
  items: TodayGameItem[];
}

function OutcomeBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-36 shrink-0 truncate" style={{ color: "#5a5a5a" }}>{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(27,67,50,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-xs font-bold w-12 text-right tabular-nums" style={{ color }}>
          {count} <span className="font-normal" style={{ color: "#9a9a9a" }}>({pct}%)</span>
        </span>
      </div>
    </div>
  );
}

const SCORE_MEDAL = ["🥇", "🥈", "🥉"];

function GameAccordion({ item }: { item: TodayGameItem }) {
  const [open, setOpen] = useState(false);
  const { game, result, stats } = item;

  const time = game.date.slice(11, 16);
  const hasResult = result?.scoreA != null && result?.scoreB != null;
  const phaseLabel = game.group ? `Grupo ${game.group}` : PHASE_LABELS[game.phase];

  return (
    <div
      className="rounded-[16px] border overflow-hidden"
      style={{ borderColor: "rgba(27,67,50,0.08)" }}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#1b4332]/4"
        style={{ backgroundColor: open ? "rgba(27,67,50,0.03)" : "white" }}
      >
        {/* Time */}
        <span className="text-xs font-bold w-11 shrink-0 tabular-nums" style={{ color: "#5a5a5a" }}>
          {time}h
        </span>

        {/* Teams + score */}
        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
          <span className="font-semibold text-sm" style={{ color: "#1b4332" }}>
            {game.teamA}
          </span>
          {hasResult ? (
            <span className="font-black text-base shrink-0 tabular-nums" style={{ color: "#1b4332" }}>
              {result!.scoreA} — {result!.scoreB}
            </span>
          ) : (
            <span className="text-xs shrink-0" style={{ color: "#9a9a9a" }}>vs</span>
          )}
          <span className="font-semibold text-sm text-right" style={{ color: "#1b4332" }}>
            {game.teamB}
          </span>
        </div>

        {/* Phase + toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full hidden sm:inline"
            style={{ backgroundColor: "rgba(82,183,136,0.10)", color: "#2d6a4f" }}
          >
            {phaseLabel}
          </span>
          {stats.total > 0 && (
            <span className="text-xs" style={{ color: "#9a9a9a" }}>
              {stats.total} aposta{stats.total !== 1 ? "s" : ""}
            </span>
          )}
          <span
            className="text-sm transition-transform duration-200"
            style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "none", color: "#9a9a9a" }}
          >
            ▾
          </span>
        </div>
      </button>

      {/* Expanded stats */}
      {open && (
        <div
          className="px-4 pb-4 pt-3 space-y-4 border-t"
          style={{ borderColor: "rgba(27,67,50,0.06)", backgroundColor: "#fafcfa" }}
        >
          {stats.total === 0 ? (
            <p className="text-sm text-center py-2" style={{ color: "#9a9a9a" }}>
              Nenhum palpite registrado para este jogo.
            </p>
          ) : (
            <>
              {/* Outcome distribution */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9a9a9a" }}>
                  {game.phase === "grupos" ? "Resultado esperado" : "Quem avança"} · {stats.total} participante{stats.total !== 1 ? "s" : ""}
                </p>
                <OutcomeBar label={`${game.teamA} vence`} count={stats.homeWins} total={stats.total} color="#1b4332" />
                {game.phase === "grupos" && (
                  <OutcomeBar label="Empate" count={stats.draws} total={stats.total} color="#c9a84c" />
                )}
                <OutcomeBar label={`${game.teamB} vence`} count={stats.awayWins} total={stats.total} color="#52b788" />
                {game.phase !== "grupos" && stats.othersCount > 0 && (
                  <OutcomeBar label="Outros times" count={stats.othersCount} total={stats.total} color="#c9a84c" />
                )}
              </div>

              {/* Top scores */}
              {stats.topScores.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9a9a9a" }}>
                    Placares mais apostados
                  </p>
                  <div className="space-y-1.5">
                    {stats.topScores.map((s, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm">
                        <span className="text-base w-5 shrink-0">{SCORE_MEDAL[i]}</span>
                        <span className="font-black tabular-nums" style={{ color: "#1b4332" }}>
                          {s.scoreA} — {s.scoreB}
                        </span>
                        <span style={{ color: "#9a9a9a" }}>·</span>
                        <span className="font-semibold" style={{ color: "#5a5a5a" }}>
                          {s.count} aposta{s.count !== 1 ? "s" : ""}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(27,67,50,0.08)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.round((s.count / stats.total) * 100)}%`, backgroundColor: "#52b788" }}
                          />
                        </div>
                      </div>
                    ))}
                    {stats.othersCount > 0 && (
                      <p className="text-xs pl-7" style={{ color: "#9a9a9a" }}>
                        + {stats.othersCount} outro{stats.othersCount !== 1 ? "s" : ""} placar{stats.othersCount !== 1 ? "es" : ""}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function TodayGames({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-[20px] border p-5 space-y-3"
      style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "#5a5a5a" }}>
            Jogos de Hoje
          </p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#dc2626" }}>
            {items.length} jogo{items.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {items.map(({ game, result, stats }) => (
          <GameAccordion key={game.id} item={{ game, result, stats }} />
        ))}
      </div>
    </div>
  );
}
