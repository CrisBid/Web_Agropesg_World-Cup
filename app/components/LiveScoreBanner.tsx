"use client";

import { useEffect, useState } from "react";
import type { LiveMatch, LiveStats } from "@/lib/api-football";

interface BudgetInfo {
  todayGames: number;
  reqPerGame: number;
  liveTTL: number;
  statsTTL: number;
  clientPollMs: number;
}

interface LiveResponse {
  matches: LiveMatch[];
  expected: boolean;
  fetchedAt?: string;
  budget: BudgetInfo;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function StatBar({ label, home, away, unit = "" }: {
  label: string; home: number; away: number; unit?: string;
}) {
  const total = home + away || 1;
  const homePct = Math.round((home / total) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-5 text-right font-semibold" style={{ color: "#1b4332" }}>
        {home}{unit}
      </span>
      <div className="flex-1 flex h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(27,67,50,0.12)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${homePct}%`, backgroundColor: "#1b4332" }} />
      </div>
      <span className="text-xs w-20 text-center" style={{ color: "#5a5a5a" }}>{label}</span>
      <div className="flex-1 flex h-1.5 rounded-full overflow-hidden justify-end" style={{ backgroundColor: "rgba(27,67,50,0.12)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${100 - homePct}%`, backgroundColor: "#52b788" }} />
      </div>
      <span className="w-5 font-semibold" style={{ color: "#52b788" }}>
        {away}{unit}
      </span>
    </div>
  );
}

function MatchCard({ match, expanded, onToggle }: {
  match: LiveMatch;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isHt = match.status === "HT";
  const isLive = !["FT", "NS", "TBD", "CANC", "SUSP"].includes(match.status);
  const stats: LiveStats | null = match.stats ?? null;

  return (
    <div
      className="rounded-[16px] border overflow-hidden transition-all"
      style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.10)" }}
    >
      {/* Score row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1b4332]/4"
      >
        {/* Status badge */}
        <span
          className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[48px] text-center"
          style={
            isHt
              ? { backgroundColor: "rgba(201,168,76,0.15)", color: "#a16207" }
              : isLive
              ? { backgroundColor: "rgba(220,38,38,0.12)", color: "#dc2626" }
              : { backgroundColor: "rgba(27,67,50,0.08)", color: "#5a5a5a" }
          }
        >
          {isLive && !isHt && match.elapsed ? `${match.elapsed}'` : match.statusLabel}
        </span>

        {/* Home team + score + away team */}
        <div className="flex-1 flex items-center justify-between gap-2">
          <span className="font-semibold text-sm truncate" style={{ color: "#1b4332" }}>
            {match.homeTeam}
          </span>
          <span className="text-xl font-black shrink-0 tabular-nums" style={{ color: "#1b4332" }}>
            {match.homeGoals} — {match.awayGoals}
          </span>
          <span className="font-semibold text-sm truncate text-right" style={{ color: "#1b4332" }}>
            {match.awayTeam}
          </span>
        </div>

        {/* Expand icon */}
        {stats && (
          <span className="text-xs shrink-0 transition-transform" style={{ color: "#5a5a5a", transform: expanded ? "rotate(180deg)" : "none" }}>▾</span>
        )}
      </button>

      {/* Goal events */}
      {match.events.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-x-4 gap-y-0.5">
          {match.events.map((e, i) => (
            <span key={i} className="text-xs" style={{ color: "#5a5a5a" }}>
              ⚽{e.type !== "Gol" ? ` (${e.type})` : ""} {e.player} {e.elapsed}′{e.extraTime ? `+${e.extraTime}` : ""}
              {" · "}<span className="font-medium">{e.teamPortuguese}</span>
            </span>
          ))}
        </div>
      )}

      {/* Stats panel */}
      {expanded && stats && (
        <div className="px-4 pt-1 pb-3 space-y-2 border-t" style={{ borderColor: "rgba(27,67,50,0.06)" }}>
          <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#5a5a5a" }}>
            <span>{match.homeTeam}</span>
            <span>Estatísticas</span>
            <span>{match.awayTeam}</span>
          </div>
          <StatBar label="Posse"         home={stats.possession.home}    away={stats.possession.away}    unit="%" />
          <StatBar label="Finalizações"  home={stats.totalShots.home}    away={stats.totalShots.away}    />
          <StatBar label="No alvo"       home={stats.shotsOnTarget.home} away={stats.shotsOnTarget.away} />
          <StatBar label="Escanteios"    home={stats.corners.home}       away={stats.corners.away}       />
          <StatBar label="Faltas"        home={stats.fouls.home}         away={stats.fouls.away}         />
          <StatBar label="🟨 Cartões"    home={stats.yellowCards.home}   away={stats.yellowCards.away}   />
          {(stats.redCards.home > 0 || stats.redCards.away > 0) && (
            <StatBar label="🟥 Vermelhos" home={stats.redCards.home}    away={stats.redCards.away}      />
          )}
          <StatBar label="Defesas"       home={stats.saves.home}         away={stats.saves.away}         />
        </div>
      )}
    </div>
  );
}

// ─── Main banner ──────────────────────────────────────────────────────────

export default function LiveScoreBanner() {
  const [data, setData] = useState<LiveResponse | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (res.ok && !cancelled) {
          const json: LiveResponse = await res.json();
          setData(json);
          // Use server-recommended interval (dynamic based on today's game count).
          // Never poll faster than 30 s client-side.
          const delay = Math.max(30_000, json.budget?.clientPollMs ?? 60_000);
          setTimeout(poll, delay);
        } else if (!cancelled) {
          setTimeout(poll, 60_000);
        }
      } catch {
        if (!cancelled) setTimeout(poll, 60_000);
      }
    }

    poll();
    return () => { cancelled = true; };
  }, []);

  const matches = data?.matches ?? [];
  if (matches.length === 0) return null;

  return (
    <div
      className="w-full border-b"
      style={{ backgroundColor: "#f0faf4", borderColor: "rgba(27,67,50,0.10)" }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#dc2626" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            AO VIVO
          </span>
          <span className="text-xs" style={{ color: "#5a5a5a" }}>
            {matches.length} jogo{matches.length !== 1 ? "s" : ""} em andamento · Copa 2026
          </span>
        </div>

        {/* Match cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {matches.map((m) => (
            <MatchCard
              key={m.fixtureId}
              match={m}
              expanded={expandedId === m.fixtureId}
              onToggle={() => setExpandedId(expandedId === m.fixtureId ? null : m.fixtureId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
