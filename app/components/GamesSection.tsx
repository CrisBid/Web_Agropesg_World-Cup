"use client";

import { useState } from "react";
import Link from "next/link";
import GameCard from "./GameCard";
import type { GameResult } from "./GameCard";
import { PHASE_LABELS } from "@/lib/games-data";
import type { Phase } from "@/lib/games-data";

export interface GameEntry {
  id: number;
  num: number;
  date: string;
  stadium: string;
  teamA: string;
  teamB: string;
  phase: Phase;
  group?: string;
  result?: GameResult;
}

export interface GameGroup {
  date: string;
  isToday: boolean;
  label: string;
  games: GameEntry[];
}

interface Props {
  groups: GameGroup[];
}

export default function GamesSection({ groups }: Props) {
  const [open, setOpen] = useState(false);

  if (groups.length === 0) return null;

  const todayGroup = groups.find((g) => g.isToday);
  const nextGroups = groups.filter((g) => !g.isToday);
  const hasNext = nextGroups.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
          Jogos
        </h2>
        <Link href="/calendario" className="text-sm font-semibold transition-colors hover:opacity-70"
          style={{ color: "#2d6a4f" }}>
          Calendário completo →
        </Link>
      </div>

      {/* Today */}
      {todayGroup ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: "#dc2626" }}>
              Hoje
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full align-middle"
                style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#dc2626" }}>
                {todayGroup.games.length} jogo{todayGroup.games.length !== 1 ? "s" : ""}
              </span>
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: "rgba(27,67,50,0.08)" }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {todayGroup.games.map((g) => (
              <GameCard key={g.id} game={g} result={g.result} compact />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "#9a9a9a" }}>Nenhum jogo hoje.</p>
      )}

      {/* Accordion for next days */}
      {hasNext && (
        <div className="rounded-[16px] border overflow-hidden"
          style={{ borderColor: "rgba(27,67,50,0.08)" }}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold transition-colors hover:bg-[#1b4332]/4"
            style={{ backgroundColor: open ? "rgba(27,67,50,0.04)" : "white", color: "#1b4332" }}
          >
            <span>
              Próximos {nextGroups.length > 1 ? `${nextGroups.length} dias` : "dias"}
              <span className="ml-2 text-xs font-normal" style={{ color: "#9a9a9a" }}>
                ({nextGroups.reduce((s, g) => s + g.games.length, 0)} jogos)
              </span>
            </span>
            <span
              className="text-xs transition-transform duration-200"
              style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "none", color: "#5a5a5a" }}
            >
              ▾
            </span>
          </button>

          {open && (
            <div className="px-5 pb-5 pt-3 space-y-4 border-t"
              style={{ borderColor: "rgba(27,67,50,0.08)", backgroundColor: "white" }}>
              {nextGroups.map(({ date, label, games }) => (
                <div key={date} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold" style={{ color: "#5a5a5a" }}>{label}</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: "rgba(27,67,50,0.08)" }} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {games.map((g) => (
                      <GameCard key={g.id} game={g} result={g.result} compact />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
