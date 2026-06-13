"use client";

import { useEffect, useState, useRef } from "react";
import type { LiveMatch, LiveStats } from "@/lib/api-football";
import { GAMES, PHASE_LABELS } from "@/lib/games-data";

const POST_GAME_FREEZE_MS = 30 * 60_000; // show frozen result for 30 min

interface UpcomingGame {
  gameId: number;
  teamA: string;
  teamB: string;
  phase: string;
  group?: string;
  kickoffMs: number;
}

interface BudgetInfo {
  todayGames: number; reqPerGame: number; liveTTL: number; statsTTL: number; clientPollMs: number;
}

interface LiveResponse {
  matches: LiveMatch[];
  upcoming: UpcomingGame[];
  expected: boolean;
  fetchedAt?: string;
  budget: BudgetInfo;
  testMode?: "pre" | "live" | "post";
  disabled?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function gameLabel(gameId: number | null | undefined): string {
  if (gameId == null) return "";
  const g = GAMES.find((x) => x.id === gameId);
  if (!g) return "";
  return g.group ? `Grupo ${g.group}` : (PHASE_LABELS[g.phase] ?? "");
}

function StatBar({ label, home, away, unit = "" }: { label: string; home: number; away: number; unit?: string }) {
  const total = home + away || 1;
  const homePct = Math.round((home / total) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-6 text-right font-bold tabular-nums" style={{ color: "#1b4332" }}>{home}{unit}</span>
      <div className="flex-1 flex h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(27,67,50,0.12)" }}>
        <div className="h-full rounded-l-full transition-all duration-700" style={{ width: `${homePct}%`, backgroundColor: "#1b4332" }} />
      </div>
      <span className="text-[10px] w-20 text-center font-semibold uppercase tracking-wide shrink-0" style={{ color: "#9a9a9a" }}>{label}</span>
      <div className="flex-1 flex h-1.5 rounded-full overflow-hidden justify-end" style={{ backgroundColor: "rgba(27,67,50,0.12)" }}>
        <div className="h-full rounded-r-full transition-all duration-700" style={{ width: `${100 - homePct}%`, backgroundColor: "#52b788" }} />
      </div>
      <span className="w-6 font-bold tabular-nums" style={{ color: "#52b788" }}>{away}{unit}</span>
    </div>
  );
}

function MatchCard({ match, expanded, onToggle, frozen }: {
  match: LiveMatch; expanded: boolean; onToggle: () => void; frozen?: boolean;
}) {
  const isHt   = match.status === "HT";
  const isFt   = match.status === "FT";
  const isLive = !["FT", "NS", "TBD", "CANC", "SUSP"].includes(match.status);
  const stats: LiveStats | null = match.stats ?? null;
  const label = gameLabel(match.gameId);

  return (
    <div className="rounded-[16px] border overflow-hidden"
      style={{
        backgroundColor: "white",
        borderColor: isFt ? "rgba(27,67,50,0.12)" : isHt ? "rgba(201,168,76,0.30)" : "rgba(220,38,38,0.20)",
      }}>

      {/* Score row */}
      <button onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1b4332]/4">

        {/* Status badge */}
        <div className="flex flex-col items-center shrink-0 w-12">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-center w-full"
            style={
              isFt   ? { backgroundColor: "rgba(27,67,50,0.08)", color: "#5a5a5a" }
              : isHt ? { backgroundColor: "rgba(201,168,76,0.18)", color: "#a16207" }
              : isLive ? { backgroundColor: "rgba(220,38,38,0.14)", color: "#dc2626" }
              : { backgroundColor: "rgba(27,67,50,0.08)", color: "#5a5a5a" }
            }>
            {isFt ? "FIM" : isHt ? "INT" : isLive && match.elapsed ? `${match.elapsed}'` : match.statusLabel}
          </span>
          {frozen && isFt && (
            <span className="text-[9px] mt-0.5 font-semibold" style={{ color: "#9a9a9a" }}>congelado</span>
          )}
        </div>

        {/* Teams + score */}
        <div className="flex-1 min-w-0">
          {label && (
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#9a9a9a" }}>
              {label}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm truncate" style={{ color: "#1b4332" }}>{match.homeTeam}</span>
            <span className="text-xl font-black shrink-0 tabular-nums"
              style={{ color: isFt ? "#1b4332" : isHt ? "#a16207" : "#dc2626" }}>
              {match.homeGoals} — {match.awayGoals}
            </span>
            <span className="font-bold text-sm truncate text-right" style={{ color: "#1b4332" }}>{match.awayTeam}</span>
          </div>
        </div>

        {stats && (
          <span className="text-xs shrink-0 transition-transform duration-200"
            style={{ color: "#9a9a9a", display: "inline-block", transform: expanded ? "rotate(180deg)" : "none" }}>
            ▾
          </span>
        )}
      </button>

      {/* Goal events */}
      {match.events.length > 0 && (
        <div className="px-4 pb-2.5 flex flex-col gap-0.5" style={{ borderTop: "1px solid rgba(27,67,50,0.05)" }}>
          {match.events.map((e, i) => (
            <div key={i} className="flex items-baseline gap-2 text-xs py-0.5">
              <span className="font-mono tabular-nums shrink-0" style={{ color: "#9a9a9a" }}>
                {e.elapsed}′{e.extraTime ? `+${e.extraTime}` : ""}
              </span>
              <span className="shrink-0">⚽{e.type !== "Gol" ? ` (${e.type})` : ""}</span>
              <span className="font-semibold truncate" style={{ color: "#1b4332" }}>{e.player}</span>
              <span className="text-[10px] shrink-0" style={{ color: "#52b788" }}>{e.teamPortuguese}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats panel */}
      {expanded && stats && (
        <div className="px-4 pt-2 pb-3 space-y-1.5 border-t" style={{ borderColor: "rgba(27,67,50,0.06)", backgroundColor: "#fafcfa" }}>
          <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#9a9a9a" }}>
            <span>{match.homeTeam}</span>
            <span>Estatísticas</span>
            <span>{match.awayTeam}</span>
          </div>
          <StatBar label="Posse"        home={stats.possession.home}    away={stats.possession.away}    unit="%" />
          <StatBar label="Finalizações" home={stats.totalShots.home}    away={stats.totalShots.away}    />
          <StatBar label="No alvo"      home={stats.shotsOnTarget.home} away={stats.shotsOnTarget.away} />
          <StatBar label="Escanteios"   home={stats.corners.home}       away={stats.corners.away}       />
          <StatBar label="Faltas"       home={stats.fouls.home}         away={stats.fouls.away}         />
          <StatBar label="🟨 Cartões"   home={stats.yellowCards.home}   away={stats.yellowCards.away}   />
          {(stats.redCards.home > 0 || stats.redCards.away > 0) && (
            <StatBar label="🟥 Vermelhos" home={stats.redCards.home}   away={stats.redCards.away}      />
          )}
          <StatBar label="Defesas"      home={stats.saves.home}         away={stats.saves.away}         />
        </div>
      )}
    </div>
  );
}

// ─── Pre-game countdown ──────────────────────────────────────────────────────

function useCountdown(kickoffMs: number): string {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function tick() {
      const diff = kickoffMs - Date.now();
      if (diff <= 0) { setLabel("Começa agora!"); return; }
      const m = Math.floor(diff / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setLabel(m > 0 ? `${m} min ${s.toString().padStart(2, "0")} s` : `${s} s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [kickoffMs]);

  return label;
}

function UpcomingCard({ game }: { game: UpcomingGame }) {
  const countdown = useCountdown(game.kickoffMs);
  const label = game.group ? `Grupo ${game.group}` : PHASE_LABELS[game.phase as keyof typeof PHASE_LABELS] ?? game.phase;

  return (
    <div className="rounded-[16px] border px-4 py-3 flex items-center gap-4"
      style={{ backgroundColor: "white", borderColor: "rgba(201,168,76,0.30)" }}>
      <div className="shrink-0 text-center">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full block mb-1"
          style={{ backgroundColor: "rgba(201,168,76,0.18)", color: "#a16207" }}>
          EM BREVE
        </span>
        <span className="text-sm font-black tabular-nums block" style={{ color: "#a16207" }}>{countdown}</span>
      </div>
      <div className="flex-1 min-w-0">
        {label && <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#9a9a9a" }}>{label}</p>}
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-sm truncate" style={{ color: "#1b4332" }}>{game.teamA}</span>
          <span className="text-base font-black shrink-0" style={{ color: "#9a9a9a" }}>vs</span>
          <span className="font-bold text-sm truncate text-right" style={{ color: "#1b4332" }}>{game.teamB}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Banner ─────────────────────────────────────────────────────────────

export default function LiveScoreBanner() {
  const [data, setData] = useState<LiveResponse | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Post-game freeze state
  const [frozenMatches, setFrozenMatches] = useState<LiveMatch[]>([]);
  const [gameEndedAt, setGameEndedAt] = useState<number | null>(null);
  const hadLiveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (res.ok && !cancelled) {
          const json: LiveResponse = await res.json();
          setData(json);

          const isTestPost = json.testMode === "post";

          // Track live → ended transition (for real games and test "post" mode)
          if (json.matches.length > 0 && !isTestPost) {
            hadLiveRef.current = true;
            setFrozenMatches(json.matches); // keep updating frozen snapshot while live
            setGameEndedAt(null); // still live — reset end time
          } else if (hadLiveRef.current && json.matches.length === 0 && !isTestPost) {
            // Game just ended: start freeze
            setGameEndedAt((prev) => prev ?? Date.now());
          }

          // For test "post" mode: always freeze the fake match
          if (isTestPost && json.matches.length > 0) {
            setFrozenMatches(json.matches);
            setGameEndedAt((prev) => prev ?? Date.now());
            hadLiveRef.current = true;
          }

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
  const upcoming = data?.upcoming ?? [];
  const testMode = data?.testMode;

  // Determine what to show
  const isLive = matches.length > 0 && testMode !== "post";
  const isPostGame = !isLive && gameEndedAt !== null && (Date.now() - gameEndedAt < POST_GAME_FREEZE_MS);
  const isPre = !isLive && !isPostGame && upcoming.length > 0;

  if (!isLive && !isPostGame && !isPre) return null;

  const displayMatches = isLive ? matches : frozenMatches;

  return (
    <div className="w-full border-b"
      style={{
        backgroundColor: isPostGame ? "#f5f5f5"
          : isPre ? "rgba(201,168,76,0.06)"
          : "#f0faf4",
        borderColor: isPostGame ? "rgba(27,67,50,0.10)"
          : isPre ? "rgba(201,168,76,0.20)"
          : "rgba(27,67,50,0.10)",
      }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">

        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {isPostGame ? (
              <>
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(27,67,50,0.10)", color: "#1b4332" }}>
                  ✓ Encerrado
                </span>
                <span className="text-xs" style={{ color: "#5a5a5a" }}>
                  Resultado final · visível por {Math.max(0, Math.round((POST_GAME_FREEZE_MS - (Date.now() - gameEndedAt!)) / 60_000))} min
                </span>
              </>
            ) : isPre ? (
              <>
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(201,168,76,0.18)", color: "#a16207" }}>
                  🕐 Em breve
                </span>
                <span className="text-xs" style={{ color: "#5a5a5a" }}>
                  {upcoming.length} jogo{upcoming.length !== 1 ? "s" : ""} começando em breve · Copa 2026
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#dc2626" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                  AO VIVO
                </span>
                <span className="text-xs" style={{ color: "#5a5a5a" }}>
                  {matches.length} jogo{matches.length !== 1 ? "s" : ""} em andamento · Copa 2026
                </span>
              </>
            )}
          </div>
          {testMode && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(220,38,38,0.10)", color: "#dc2626" }}>
              MODO TESTE
            </span>
          )}
        </div>

        {/* Match cards (live or frozen post-game) */}
        {(isLive || isPostGame) && displayMatches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {displayMatches.map((m) => (
              <MatchCard
                key={m.fixtureId}
                match={m}
                frozen={isPostGame}
                expanded={expandedId === m.fixtureId}
                onToggle={() => setExpandedId(expandedId === m.fixtureId ? null : m.fixtureId)}
              />
            ))}
          </div>
        )}

        {/* Upcoming game cards */}
        {isPre && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {upcoming.map((g) => <UpcomingCard key={g.gameId} game={g} />)}
          </div>
        )}
      </div>
    </div>
  );
}
