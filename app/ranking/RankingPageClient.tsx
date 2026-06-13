"use client";

import { useState, useCallback, useRef } from "react";
import type { Game } from "@/lib/games-data";
import { PHASE_LABELS } from "@/lib/games-data";
import type { GamePredictionStats } from "@/lib/data";
import RankingSection from "./RankingSection";
import type { TodayGameItem } from "./TodayGames";
import type { RankingEntry } from "./RankingSection";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIZES_CENTS = [220000, 80000, 50000, 20000, 10000];
const SCORE_MEDAL = ["🥇", "🥈", "🥉"];

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Collapsed bar (shown instead of a section when live is active) ───────────

function CollapsedBar({ title, badge, onOpen }: { title: string; badge?: string; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center justify-between px-5 py-3.5 rounded-[20px] border transition-colors hover:shadow-sm"
      style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "#5a5a5a" }}>
          {title}
        </span>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#dc2626" }}>
            {badge}
          </span>
        )}
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "rgba(27,67,50,0.08)", color: "#5a5a5a" }}>
          minimizado durante o ao vivo
        </span>
      </div>
      <span className="text-sm" style={{ color: "#9a9a9a" }}>▾</span>
    </button>
  );
}

// ─── Individual game row (same content as TodayGames > GameAccordion) ─────────

function OutcomeBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-36 shrink-0 truncate" style={{ color: "#5a5a5a" }}>{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(27,67,50,0.08)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <span className="text-xs font-bold w-12 text-right tabular-nums" style={{ color }}>
          {count} <span className="font-normal" style={{ color: "#9a9a9a" }}>({pct}%)</span>
        </span>
      </div>
    </div>
  );
}

function GameRow({ game, result, stats }: {
  game: Game;
  result?: { scoreA?: number | null; scoreB?: number | null; winner?: string } | null;
  stats: GamePredictionStats;
}) {
  const [open, setOpen] = useState(false);
  const time = game.date.slice(11, 16);
  const hasResult = result?.scoreA != null && result?.scoreB != null;
  const phaseLabel = game.group ? `Grupo ${game.group}` : PHASE_LABELS[game.phase];

  return (
    <div className="rounded-[16px] border overflow-hidden" style={{ borderColor: "rgba(27,67,50,0.08)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#1b4332]/4"
        style={{ backgroundColor: open ? "rgba(27,67,50,0.03)" : "white" }}
      >
        <span className="text-xs font-bold w-11 shrink-0 tabular-nums" style={{ color: "#5a5a5a" }}>{time}h</span>
        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
          <span className="font-semibold text-sm" style={{ color: "#1b4332" }}>{game.teamA}</span>
          {hasResult ? (
            <span className="font-black text-base shrink-0 tabular-nums" style={{ color: "#1b4332" }}>
              {result!.scoreA} — {result!.scoreB}
            </span>
          ) : (
            <span className="text-xs shrink-0" style={{ color: "#9a9a9a" }}>vs</span>
          )}
          <span className="font-semibold text-sm text-right" style={{ color: "#1b4332" }}>{game.teamB}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full hidden sm:inline"
            style={{ backgroundColor: "rgba(82,183,136,0.10)", color: "#2d6a4f" }}>
            {phaseLabel}
          </span>
          {stats.total > 0 && (
            <span className="text-xs" style={{ color: "#9a9a9a" }}>
              {stats.total} aposta{stats.total !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-sm transition-transform duration-200"
            style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "none", color: "#9a9a9a" }}>
            ▾
          </span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 space-y-4 border-t"
          style={{ borderColor: "rgba(27,67,50,0.06)", backgroundColor: "#fafcfa" }}>
          {stats.total === 0 ? (
            <p className="text-sm text-center py-2" style={{ color: "#9a9a9a" }}>
              Nenhum palpite registrado para este jogo.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9a9a9a" }}>
                  Resultado esperado · {stats.total} participante{stats.total !== 1 ? "s" : ""}
                </p>
                <OutcomeBar label={`${game.teamA} vence`} count={stats.homeWins} total={stats.total} color="#1b4332" />
                <OutcomeBar label="Empate" count={stats.draws} total={stats.total} color="#c9a84c" />
                <OutcomeBar label={`${game.teamB} vence`} count={stats.awayWins} total={stats.total} color="#52b788" />
              </div>
              {stats.topScores.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9a9a9a" }}>
                    Placares mais apostados
                  </p>
                  <div className="space-y-1.5">
                    {stats.topScores.map((s, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm">
                        <span className="text-base w-5 shrink-0">{SCORE_MEDAL[i]}</span>
                        <span className="font-black tabular-nums" style={{ color: "#1b4332" }}>{s.scoreA} — {s.scoreB}</span>
                        <span style={{ color: "#9a9a9a" }}>·</span>
                        <span className="font-semibold" style={{ color: "#5a5a5a" }}>{s.count} aposta{s.count !== 1 ? "s" : ""}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(27,67,50,0.08)" }}>
                          <div className="h-full rounded-full"
                            style={{ width: `${Math.round((s.count / stats.total) * 100)}%`, backgroundColor: "#52b788" }} />
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

// ─── Main client component ────────────────────────────────────────────────────

interface Props {
  todayItems: TodayGameItem[];
  entries: RankingEntry[];
}

export default function RankingPageClient({ todayItems, entries }: Props) {
  const [todayOpen, setTodayOpen] = useState(true);
  const [prizesOpen, setPrizesOpen] = useState(true);
  const liveActivatedRef = useRef(false);

  const handleLiveChange = useCallback((isLive: boolean) => {
    if (isLive && !liveActivatedRef.current) {
      liveActivatedRef.current = true;
      setTodayOpen(false);
      setPrizesOpen(false);
    }
  }, []);

  return (
    <>
      {/* Jogos de Hoje — collapses when live ranking is active */}
      {todayItems.length > 0 && (
        todayOpen ? (
          <div className="rounded-[20px] border overflow-hidden"
            style={{ borderColor: "rgba(27,67,50,0.08)", backgroundColor: "white" }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "#5a5a5a" }}>
                  Jogos de Hoje
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#dc2626" }}>
                  {todayItems.length} jogo{todayItems.length !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={() => setTodayOpen(false)}
                className="text-xs px-2 py-1 rounded-full transition-colors hover:bg-[#1b4332]/6"
                style={{ color: "#9a9a9a" }}
              >
                ▴ ocultar
              </button>
            </div>
            <div className="px-5 pb-5 pt-3 space-y-2">
              {todayItems.map(({ game, result, stats }) => (
                <GameRow key={game.id} game={game} result={result} stats={stats} />
              ))}
            </div>
          </div>
        ) : (
          <CollapsedBar
            title="Jogos de Hoje"
            badge={`${todayItems.length} jogo${todayItems.length !== 1 ? "s" : ""}`}
            onOpen={() => setTodayOpen(true)}
          />
        )
      )}

      {/* Premiação — collapses when live ranking is active */}
      {prizesOpen ? (
        <div className="rounded-[20px] border overflow-hidden"
          style={{ borderColor: "rgba(27,67,50,0.08)", backgroundColor: "white" }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-0">
            <p className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "#5a5a5a" }}>
              Premiação
            </p>
            <button
              onClick={() => setPrizesOpen(false)}
              className="text-xs px-2 py-1 rounded-full transition-colors hover:bg-[#1b4332]/6"
              style={{ color: "#9a9a9a" }}
            >
              ▴ ocultar
            </button>
          </div>
          <div className="px-5 pb-5 pt-4">
            <div className="flex flex-wrap gap-3">
              {PRIZES_CENTS.map((v, i) => (
                <div key={i}
                  className="flex items-center gap-2.5 rounded-[12px] px-4 py-2.5 border"
                  style={{
                    backgroundColor: i === 0 ? "rgba(201,168,76,0.08)" : "rgba(27,67,50,0.03)",
                    borderColor: i === 0 ? "rgba(201,168,76,0.30)" : "rgba(27,67,50,0.08)",
                  }}>
                  <span className="text-lg">{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i]}</span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#5a5a5a" }}>
                      {i + 1}º lugar
                    </p>
                    <p className="text-sm font-black" style={{ color: i === 0 ? "#8b7028" : "#1b4332" }}>
                      {formatBRL(v)}
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2.5 rounded-[12px] px-4 py-2.5 border"
                style={{ backgroundColor: "rgba(82,183,136,0.06)", borderColor: "rgba(82,183,136,0.20)" }}>
                <span className="text-lg">💰</span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#5a5a5a" }}>Total</p>
                  <p className="text-sm font-black" style={{ color: "#1b4332" }}>
                    {formatBRL(PRIZES_CENTS.reduce((s, v) => s + v, 0))}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs mt-3" style={{ color: "#9a9a9a" }}>
              Em caso de empate, o prêmio das colocações é dividido igualmente entre os empatados.
            </p>
          </div>
        </div>
      ) : (
        <CollapsedBar title="Premiação" onOpen={() => setPrizesOpen(true)} />
      )}

      {/* Ranking com live + acordeão */}
      <RankingSection entries={entries} onLiveChange={handleLiveChange} />
    </>
  );
}
