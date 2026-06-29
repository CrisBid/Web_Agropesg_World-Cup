"use client";

import { useState } from "react";
import GameAccordion from "./GameAccordion";
import type { GameAccordionData } from "./GameAccordion";
import { PHASE_LABELS } from "@/lib/games-data";
import type { Phase } from "@/lib/games-data";

export interface PhaseGroup {
  phase: Phase;
  totalGames: number;
  playedGames: number;
  dates: { date: string; gameIds: number[] }[];
}

interface Props {
  phases: PhaseGroup[];
  accordionData: Record<number, GameAccordionData>;
  today: string;
}

function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${days[d.getUTCDay()]}, ${day} de ${months[month - 1]}`;
}

export default function JogosPhases({ phases, accordionData, today }: Props) {
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    for (const p of phases) {
      // Open if phase is not fully completed
      state[p.phase] = p.playedGames < p.totalGames;
    }
    return state;
  });

  function toggle(phase: string) {
    setOpenPhases((prev) => ({ ...prev, [phase]: !prev[phase] }));
  }

  return (
    <div className="space-y-3">
      {phases.map(({ phase, dates, totalGames, playedGames }) => {
        const isDone   = totalGames > 0 && playedGames === totalGames;
        const isActive = playedGames > 0 && playedGames < totalGames;
        const isOpen   = openPhases[phase] ?? !isDone;

        return (
          <div key={phase} className="rounded-[20px] border overflow-hidden"
            style={{ borderColor: "rgba(27,67,50,0.08)" }}>

            {/* Phase accordion header */}
            <button
              onClick={() => toggle(phase)}
              className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#1b4332]/4"
              style={{ backgroundColor: isOpen ? "rgba(27,67,50,0.03)" : "white" }}>

              <div className="flex items-center gap-2.5 min-w-0">
                <h2 className="text-lg font-bold shrink-0"
                  style={{
                    color: isDone ? "#9a9a9a" : "#1b4332",
                    fontFamily: "var(--font-playfair)",
                  }}>
                  {PHASE_LABELS[phase]}
                </h2>

                {isDone ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: "rgba(27,67,50,0.07)", color: "#9a9a9a" }}>
                    Concluída
                  </span>
                ) : isActive ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "#2d6a4f" }}>
                    Em andamento
                  </span>
                ) : null}

                <span className="text-xs shrink-0 tabular-nums" style={{ color: "#b0b0b0" }}>
                  {playedGames}/{totalGames}
                </span>
              </div>

              <span className="text-sm shrink-0 ml-3 transition-transform duration-200"
                style={{
                  display: "inline-block",
                  transform: isOpen ? "rotate(180deg)" : "none",
                  color: "#5a5a5a",
                }}>
                ▾
              </span>
            </button>

            {/* Phase content */}
            {isOpen && (
              <div className="border-t px-5 pt-4 pb-5 space-y-5"
                style={{ borderColor: "rgba(27,67,50,0.08)" }}>
                {dates.map(({ date, gameIds }) => {
                  const isToday = date === today;
                  const isPast  = date < today;
                  return (
                    <div key={date} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold"
                          style={{ color: isToday ? "#dc2626" : isPast ? "#9a9a9a" : "#1b4332" }}>
                          {formatDateBR(date)}
                          {isToday && (
                            <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full align-middle"
                              style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#dc2626" }}>
                              HOJE
                            </span>
                          )}
                        </span>
                        <div className="flex-1 h-px" style={{ backgroundColor: "rgba(27,67,50,0.08)" }} />
                      </div>
                      <div className="space-y-1.5">
                        {gameIds.map((id) => (
                          <GameAccordion key={id} data={accordionData[id]} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
