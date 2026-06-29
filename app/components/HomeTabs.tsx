"use client";

import { useState } from "react";
import Link from "next/link";
import type { Phase } from "@/lib/games-data";
import { PHASE_LABELS } from "@/lib/games-data";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BracketGame {
  id: number;
  date: string;
  teamA: string;
  teamB: string;
  phase: Phase;
  result?: { winner?: string; scoreA?: number | null; scoreB?: number | null };
}

export interface UpcomingDay {
  date: string;
  isToday: boolean;
  label: string;
  games: {
    id: number;
    date: string;
    teamA: string;
    teamB: string;
    phase: Phase;
    group?: string;
    result?: { scoreA?: number | null; scoreB?: number | null; winner?: string };
  }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const KNOCKOUT_PHASES: Phase[] = ["fase32", "oitavas", "quartas", "semis", "terceiro", "final"];

const PHASE_COLOR: Record<string, { bg: string; text: string }> = {
  fase32:   { bg: "rgba(82,183,136,0.12)",  text: "#2d6a4f" },
  oitavas:  { bg: "rgba(27,67,50,0.10)",    text: "#1b4332" },
  quartas:  { bg: "rgba(64,145,108,0.12)",  text: "#40916c" },
  semis:    { bg: "rgba(182,142,30,0.12)",  text: "#b68e1e" },
  terceiro: { bg: "rgba(201,168,76,0.15)",  text: "#a16207" },
  final:    { bg: "rgba(229,176,48,0.15)",  text: "#92610a" },
};

// ─── Bracket game card ────────────────────────────────────────────────────────

function BracketCard({ game }: { game: BracketGame }) {
  const played  = !!game.result?.winner;
  const hasScore = played && game.result!.scoreA != null;
  const winA    = played && game.result!.winner === game.teamA;
  const winB    = played && game.result!.winner === game.teamB;
  const tbdA    = game.teamA === "TBD";
  const tbdB    = game.teamB === "TBD";
  const timeStr = game.date.slice(11, 16);

  return (
    <div className="rounded-[14px] border overflow-hidden"
      style={{
        backgroundColor: played ? "rgba(27,67,50,0.018)" : "white",
        borderColor: winA || winB ? "rgba(27,67,50,0.14)" : "rgba(27,67,50,0.08)",
      }}>
      {/* Team A row */}
      <div className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: "rgba(27,67,50,0.06)", backgroundColor: winA ? "rgba(45,106,79,0.06)" : "transparent" }}>
        <span className="flex-1 text-sm font-semibold truncate"
          style={{ color: tbdA ? "#c0c0c0" : winA ? "#2d6a4f" : "#1b4332", fontWeight: winA ? 800 : 600 }}>
          {tbdA ? "—" : game.teamA}
        </span>
        {played && (
          <span className="text-sm font-black tabular-nums shrink-0"
            style={{ color: winA ? "#2d6a4f" : "#9a9a9a" }}>
            {hasScore ? game.result!.scoreA : ""}
          </span>
        )}
        {winA && <span className="text-xs shrink-0" style={{ color: "#2d6a4f" }}>✓</span>}
      </div>

      {/* Team B row */}
      <div className="flex items-center gap-2 px-3 py-2"
        style={{ backgroundColor: winB ? "rgba(45,106,79,0.06)" : "transparent" }}>
        <span className="flex-1 text-sm font-semibold truncate"
          style={{ color: tbdB ? "#c0c0c0" : winB ? "#2d6a4f" : "#1b4332", fontWeight: winB ? 800 : 600 }}>
          {tbdB ? "—" : game.teamB}
        </span>
        {played && (
          <span className="text-sm font-black tabular-nums shrink-0"
            style={{ color: winB ? "#2d6a4f" : "#9a9a9a" }}>
            {hasScore ? game.result!.scoreB : ""}
          </span>
        )}
        {winB && <span className="text-xs shrink-0" style={{ color: "#2d6a4f" }}>✓</span>}
      </div>

      {/* Footer: time (unplayed) */}
      {!played && !tbdA && !tbdB && (
        <div className="px-3 py-1 border-t text-right"
          style={{ borderColor: "rgba(27,67,50,0.06)", backgroundColor: "rgba(27,67,50,0.015)" }}>
          <span className="text-[10px] font-mono" style={{ color: "#9a9a9a" }}>{timeStr}h</span>
        </div>
      )}
    </div>
  );
}

// ─── Upcoming game card ───────────────────────────────────────────────────────

function UpcomingCard({ game }: { game: UpcomingDay["games"][0] }) {
  const time = game.date.slice(11, 16);
  const hasResult = game.result?.scoreA != null;
  const phaseLabel = game.group ? `Grupo ${game.group}` : PHASE_LABELS[game.phase];

  return (
    <div className="flex items-center gap-3 rounded-[12px] border px-4 py-3"
      style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
      <span className="text-xs font-bold w-11 shrink-0 tabular-nums" style={{ color: "#5a5a5a" }}>
        {time}h
      </span>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
        <span className="font-semibold text-sm truncate" style={{ color: game.teamA === "TBD" ? "#9a9a9a" : "#1b4332" }}>
          {game.teamA}
        </span>
        {hasResult ? (
          <span className="font-black text-base shrink-0 tabular-nums px-1" style={{ color: "#1b4332" }}>
            {game.result!.scoreA} — {game.result!.scoreB}
          </span>
        ) : (
          <span className="text-xs shrink-0 px-1" style={{ color: "#9a9a9a" }}>vs</span>
        )}
        <span className="font-semibold text-sm truncate text-right" style={{ color: game.teamB === "TBD" ? "#9a9a9a" : "#1b4332" }}>
          {game.teamB}
        </span>
      </div>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "#2d6a4f" }}>
        {phaseLabel}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  bracketGames: BracketGame[];
  upcomingDays: UpcomingDay[];
}

export default function HomeTabs({ bracketGames, upcomingDays }: Props) {
  const [tab, setTab] = useState<"bracket" | "games">("bracket");
  const [nextOpen, setNextOpen] = useState(false);

  const phases = KNOCKOUT_PHASES
    .map((phase) => ({
      phase,
      label: PHASE_LABELS[phase],
      color: PHASE_COLOR[phase] ?? { bg: "rgba(27,67,50,0.08)", text: "#1b4332" },
      games: bracketGames.filter((g) => g.phase === phase),
    }))
    .filter((p) => p.games.length > 0);

  const todayGroup  = upcomingDays.find((d) => d.isToday);
  const nextGroups  = upcomingDays.filter((d) => !d.isToday);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
          Copa 2026
        </h2>
        <Link href="/jogos" className="text-sm font-semibold transition-colors hover:opacity-70"
          style={{ color: "#2d6a4f" }}>
          Todos os jogos →
        </Link>
      </div>

      {/* Tab toggle */}
      <div className="flex rounded-full border p-0.5 w-fit gap-0.5"
        style={{ borderColor: "rgba(27,67,50,0.15)", backgroundColor: "rgba(27,67,50,0.03)" }}>
        {([ ["bracket", "Chaveamento"], ["games", "Próximos dias"] ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              backgroundColor: tab === key ? "#1b4332" : "transparent",
              color: tab === key ? "white" : "#5a5a5a",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── CHAVEAMENTO ── */}
      {tab === "bracket" && (
        <div className="space-y-5">
          {phases.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "#9a9a9a" }}>
              O chaveamento ainda não está disponível.
            </p>
          ) : (
            phases.map(({ phase, label, color, games }) => {
              const played = games.filter((g) => g.result?.winner).length;
              return (
                <div key={phase} className="space-y-2">
                  {/* Phase header */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full shrink-0"
                      style={{ backgroundColor: color.bg, color: color.text }}>
                      {label}
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: "rgba(27,67,50,0.08)" }} />
                    <span className="text-xs shrink-0 tabular-nums" style={{ color: "#9a9a9a" }}>
                      {played}/{games.length}
                    </span>
                  </div>

                  {/* Games grid */}
                  <div className={`grid gap-2 ${
                    games.length === 1 ? "grid-cols-1 max-w-sm" :
                    games.length <= 4 ? "grid-cols-1 sm:grid-cols-2" :
                    "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                  }`}>
                    {games.map((g) => <BracketCard key={g.id} game={g} />)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── PRÓXIMOS DIAS ── */}
      {tab === "games" && (
        <div className="space-y-4">
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
                {todayGroup.games.map((g) => <UpcomingCard key={g.id} game={g} />)}
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "#9a9a9a" }}>Nenhum jogo hoje.</p>
          )}

          {/* Next days accordion */}
          {nextGroups.length > 0 && (
            <div className="rounded-[16px] border overflow-hidden"
              style={{ borderColor: "rgba(27,67,50,0.08)" }}>
              <button
                onClick={() => setNextOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold transition-colors hover:bg-[#1b4332]/4"
                style={{ backgroundColor: nextOpen ? "rgba(27,67,50,0.04)" : "white", color: "#1b4332" }}>
                <span>
                  Próximos {nextGroups.length > 1 ? `${nextGroups.length} dias` : "dias"}
                  <span className="ml-2 text-xs font-normal" style={{ color: "#9a9a9a" }}>
                    ({nextGroups.reduce((s, g) => s + g.games.length, 0)} jogos)
                  </span>
                </span>
                <span className="text-xs transition-transform duration-200"
                  style={{ display: "inline-block", transform: nextOpen ? "rotate(180deg)" : "none", color: "#5a5a5a" }}>
                  ▾
                </span>
              </button>
              {nextOpen && (
                <div className="px-5 pb-5 pt-3 space-y-4 border-t"
                  style={{ borderColor: "rgba(27,67,50,0.08)", backgroundColor: "white" }}>
                  {nextGroups.map(({ date, label, games }) => (
                    <div key={date} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold" style={{ color: "#5a5a5a" }}>{label}</span>
                        <div className="flex-1 h-px" style={{ backgroundColor: "rgba(27,67,50,0.08)" }} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {games.map((g) => <UpcomingCard key={g.id} game={g} />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {upcomingDays.length === 0 && (
            <p className="text-sm" style={{ color: "#9a9a9a" }}>Nenhum jogo programado.</p>
          )}
        </div>
      )}
    </section>
  );
}
