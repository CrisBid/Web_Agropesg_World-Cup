"use client";

import { useState } from "react";

export interface StatRow {
  label: string;
  pts: number;
  names: string[];
}

export interface PredGroup {
  prediction: string;
  names: string[];
}

export interface GameAccordionData {
  gameId: number;
  num: number;
  teamA: string;
  teamB: string;
  time: string;
  phaseLabel: string;
  resultLabel?: string;  // "2 – 1" or "Brasil" for knockout
  hasResult: boolean;
  totalParticipants: number;
  stats: StatRow[];         // scoring breakdown (only when has result)
  predGroups: PredGroup[];  // prediction distribution
}

interface Props {
  data: GameAccordionData;
}

export default function GameAccordion({ data }: Props) {
  const [open, setOpen] = useState(false);
  const [expandedStats, setExpandedStats] = useState<Set<number>>(new Set());
  const [showAllPreds, setShowAllPreds] = useState(false);

  function toggleStat(i: number) {
    setExpandedStats((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const totalWithPred = data.predGroups.reduce((s, g) => s + g.names.length, 0);

  return (
    <div className="rounded-[14px] border overflow-hidden"
      style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.09)" }}>

      {/* ── Header / trigger ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#f7f9f7]"
      >
        {/* game # */}
        <span className="text-[10px] font-bold w-5 shrink-0 text-center" style={{ color: "#c8c8c8" }}>
          {data.num}
        </span>
        {/* time */}
        <span className="text-xs font-bold w-11 shrink-0 tabular-nums" style={{ color: "#5a5a5a" }}>
          {data.time}h
        </span>
        {/* teams + score */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <span className="font-semibold text-sm truncate" style={{ color: data.teamA === "TBD" ? "#9a9a9a" : "#1b4332" }}>
            {data.teamA}
          </span>
          {data.hasResult ? (
            <span className="font-black text-base shrink-0 tabular-nums px-1" style={{ color: "#1b4332" }}>
              {data.resultLabel}
            </span>
          ) : (
            <span className="text-xs shrink-0" style={{ color: "#c8c8c8" }}>vs</span>
          )}
          <span className="font-semibold text-sm truncate text-right" style={{ color: data.teamB === "TBD" ? "#9a9a9a" : "#1b4332" }}>
            {data.teamB}
          </span>
        </div>
        {/* phase label */}
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 hidden sm:inline"
          style={{ backgroundColor: "rgba(82,183,136,0.10)", color: "#2d6a4f" }}>
          {data.phaseLabel}
        </span>
        {/* chevron */}
        <span className="shrink-0 text-sm transition-transform duration-200" style={{
          color: "#9a9a9a",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          display: "inline-block",
        }}>▾</span>
      </button>

      {/* ── Expanded panel ── */}
      {open && (
        <div className="border-t px-4 py-4 space-y-5"
          style={{ borderColor: "rgba(27,67,50,0.07)", backgroundColor: "#fafcfa" }}>

          {/* ── Scoring stats (only when result exists) ── */}
          {data.hasResult && data.stats.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#9a9a9a" }}>
                Estatísticas de apostas
              </p>
              <div className="space-y-1.5">
                {data.stats.map((stat, i) => {
                  const count = stat.names.length;
                  const pct = data.totalParticipants > 0
                    ? Math.round((count / data.totalParticipants) * 100)
                    : 0;
                  const namesOpen = expandedStats.has(i);
                  return (
                    <div key={i}>
                      <button
                        onClick={() => toggleStat(i)}
                        className="w-full text-left"
                        disabled={count === 0}
                      >
                        <div className="flex items-center gap-2">
                          {/* label + pts */}
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-xs truncate" style={{ color: "#3a3a3a" }}>{stat.label}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "#2d6a4f" }}>
                              +{stat.pts}pt{stat.pts > 1 ? "s" : ""}
                            </span>
                          </div>
                          {/* count */}
                          <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: "#1b4332" }}>
                            {count}/{data.totalParticipants}
                          </span>
                          {/* pct */}
                          <span className="text-[10px] shrink-0 w-8 text-right" style={{ color: "#9a9a9a" }}>
                            {pct}%
                          </span>
                          {/* expand indicator */}
                          {count > 0 && (
                            <span className="text-xs shrink-0" style={{
                              color: "#b0b0b0",
                              transform: namesOpen ? "rotate(180deg)" : "rotate(0deg)",
                              display: "inline-block",
                              transition: "transform 0.15s",
                            }}>▾</span>
                          )}
                        </div>
                        {/* bar */}
                        <div className="mt-1 h-1 rounded-full overflow-hidden"
                          style={{ backgroundColor: "rgba(27,67,50,0.08)" }}>
                          <div className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: pct >= 50 ? "#52b788" : pct >= 25 ? "#95d5b2" : "#c9a84c",
                            }} />
                        </div>
                      </button>

                      {/* names list */}
                      {namesOpen && count > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5 pl-0">
                          {stat.names.map((name) => (
                            <span key={name}
                              className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "#1b4332" }}>
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Prediction distribution ── */}
          {data.predGroups.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#9a9a9a" }}>
                  Palpites ({totalWithPred}/{data.totalParticipants})
                </p>
                {data.predGroups.length > 4 && (
                  <button onClick={() => setShowAllPreds((v) => !v)}
                    className="text-[11px] font-medium" style={{ color: "#52b788" }}>
                    {showAllPreds ? "Mostrar menos" : `Ver todos (${data.predGroups.length})`}
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {(showAllPreds ? data.predGroups : data.predGroups.slice(0, 4)).map((pg) => {
                  const pct = totalWithPred > 0
                    ? Math.round((pg.names.length / totalWithPred) * 100)
                    : 0;
                  return (
                    <div key={pg.prediction}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold w-16 shrink-0 tabular-nums" style={{ color: "#1b4332" }}>
                          {pg.prediction}
                        </span>
                        <div className="flex-1 h-1 rounded-full overflow-hidden"
                          style={{ backgroundColor: "rgba(27,67,50,0.08)" }}>
                          <div className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: "#52b788" }} />
                        </div>
                        <span className="text-[10px] w-8 text-right shrink-0 tabular-nums" style={{ color: "#9a9a9a" }}>
                          {pg.names.length}×
                        </span>
                      </div>
                      <div className="mt-0.5 pl-[4.5rem] flex flex-wrap gap-1">
                        {pg.names.map((name) => (
                          <span key={name} className="text-[10px]" style={{ color: "#6a6a6a" }}>
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {data.totalParticipants - totalWithPred > 0 && (
                <p className="text-[10px]" style={{ color: "#b0b0b0" }}>
                  {data.totalParticipants - totalWithPred} participante(s) sem palpite neste jogo
                </p>
              )}
            </div>
          )}

          {data.predGroups.length === 0 && !data.hasResult && (
            <p className="text-xs text-center py-2" style={{ color: "#b0b0b0" }}>
              Nenhum palpite registrado para este jogo
            </p>
          )}
        </div>
      )}
    </div>
  );
}
