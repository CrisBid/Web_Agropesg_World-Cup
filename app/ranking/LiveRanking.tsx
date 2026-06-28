"use client";

import { useEffect, useState, useRef } from "react";

const POST_GAME_FREEZE_MS = 30 * 60_000;

interface LiveEntry {
  id: string;
  name: string;
  base: number;
  live: number;
  delta: number;
}

interface LiveRankingResponse {
  live: boolean;
  postGame?: boolean;
  liveGameIds?: number[];
  liveCount?: number;
  recentlyFinishedCount?: number;
  ranking: LiveEntry[];
  clientPollMs?: number;
}

interface Props {
  baseRanking: { id: string; name: string; total: number }[];
  onLiveChange?: (isLive: boolean) => void;
}

const PRIZES_CENTS = [220000, 80000, 50000, 20000, 10000];

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function densePosition(ranking: { live: number }[], i: number): number {
  return new Set(ranking.filter((p) => p.live > ranking[i].live).map((p) => p.live)).size + 1;
}

function calcPrizes(ranking: { live: number }[]): (number | null)[] {
  return ranking.map((_, i) => {
    const pos = densePosition(ranking, i);
    if (pos > PRIZES_CENTS.length) return null;
    const tied = ranking.filter((p) => p.live === ranking[i].live).length;
    return Math.round(PRIZES_CENTS[pos - 1] / tied);
  });
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉", 4: "4️⃣", 5: "5️⃣" };

export default function LiveRanking({ baseRanking, onLiveChange }: Props) {
  const [data, setData] = useState<LiveRankingResponse | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Post-game freeze
  const [frozenData, setFrozenData] = useState<LiveRankingResponse | null>(null);
  const [gameEndedAt, setGameEndedAt] = useState<number | null>(null);
  const hadLiveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch("/api/live-ranking", { cache: "no-store" });
        if (res.ok && !cancelled) {
          const json: LiveRankingResponse = await res.json();
          setData(json);

          if (json.live && json.ranking.length > 0) {
            // Game is live — keep updating the frozen snapshot
            hadLiveRef.current = true;
            setFrozenData(json);
            setGameEndedAt(null);
            setLastUpdate(new Date());
            onLiveChange?.(true);
          } else if (json.postGame) {
            // Test "post" mode: treat as freeze immediately
            hadLiveRef.current = true;
            setFrozenData({ ...json, live: true });
            setGameEndedAt((prev) => prev ?? Date.now());
            onLiveChange?.(true);
          } else if (!json.live && hadLiveRef.current) {
            // Live just ended: start the 30-min freeze
            setGameEndedAt((prev) => prev ?? Date.now());
          }

          const delay = Math.max(30_000, json.clientPollMs ?? 60_000);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLive = data?.live === true && (data.ranking?.length ?? 0) > 0;
  const isPostGame = !isLive && gameEndedAt !== null && (Date.now() - gameEndedAt < POST_GAME_FREEZE_MS);
  const freezeMinutesLeft = isPostGame ? Math.max(0, Math.round((POST_GAME_FREEZE_MS - (Date.now() - gameEndedAt!)) / 60_000)) : 0;

  if (!isLive && !isPostGame) return null;

  const displayData = isLive ? data! : frozenData!;
  const ranking = displayData.ranking;
  const positions = ranking.map((_, i) => densePosition(ranking, i));
  const prizes = calcPrizes(ranking);

  function isTied(i: number): boolean {
    const pos = positions[i];
    if (pos > PRIZES_CENTS.length) return false;
    return ranking.filter((p) => p.live === ranking[i].live).length > 1;
  }

  function baseDensePos(participantId: string): number {
    const sorted = [...baseRanking].sort((a, b) => b.total - a.total);
    const idx = sorted.findIndex((b) => b.id === participantId);
    if (idx === -1) return 999;
    return new Set(sorted.filter((p) => p.total > sorted[idx].total).map((p) => p.total)).size + 1;
  }

  return (
    <div className="space-y-3 mt-1">
      {/* Header */}
      <div className="flex items-center gap-3 px-1 flex-wrap">
        {isPostGame ? (
          <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "rgba(27,67,50,0.10)", color: "#1b4332" }}>
            ✓ Resultado Final
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#dc2626" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            Ranking ao vivo
          </span>
        )}
        {isLive && (() => {
          const liveCount = displayData.liveCount ?? 0;
          const recentCount = displayData.recentlyFinishedCount ?? 0;
          const total = liveCount + recentCount;
          if (total <= 1) return null;
          return (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
              {liveCount > 0 && recentCount > 0
                ? `${liveCount} ao vivo + ${recentCount} encerrado${recentCount > 1 ? "s" : ""}`
                : `${total} jogos`}
            </span>
          );
        })()}
        {isLive && lastUpdate && (
          <span className="text-xs" style={{ color: "#9a9a9a" }}>
            atualizado às {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
        {isPostGame && (
          <span className="text-xs" style={{ color: "#9a9a9a" }}>
            congelado · desaparece em {freezeMinutesLeft} min
          </span>
        )}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-12 gap-2 px-5 text-xs font-semibold uppercase tracking-wide" style={{ color: "#5a5a5a" }}>
        <div className="col-span-1">#</div>
        <div className="col-span-5 sm:col-span-4">Participante</div>
        <div className="col-span-2 text-center hidden sm:block">Base</div>
        <div className="col-span-2 text-center hidden sm:block">{isPostGame ? "Final" : "Ao vivo"}</div>
        <div className="col-span-6 sm:col-span-3 text-right">Total / Prêmio</div>
      </div>

      {ranking.map((p, i) => {
        const pos = positions[i];
        const prize = prizes[i];
        const tied = isTied(i);
        const basePos = baseDensePos(p.id);
        const moved = basePos - pos;

        return (
          <div key={p.id}
            className="grid grid-cols-12 gap-2 items-center rounded-[16px] border px-5 py-4 transition-all"
            style={{
              backgroundColor: pos === 1
                ? (isPostGame ? "rgba(82,183,136,0.06)" : "rgba(220,38,38,0.04)")
                : "white",
              borderColor:
                pos === 1 ? (isPostGame ? "rgba(82,183,136,0.30)" : "rgba(220,38,38,0.25)")
                : pos === 2 ? "rgba(160,160,170,0.25)"
                : pos === 3 ? "rgba(180,120,60,0.20)"
                : "rgba(27,67,50,0.08)",
            }}>

            <div className="col-span-1 text-xl font-bold">
              {MEDAL[pos] ?? <span className="text-sm font-bold" style={{ color: "#5a5a5a" }}>{pos}º</span>}
            </div>

            <div className="col-span-5 sm:col-span-4 flex items-center gap-2 min-w-0">
              <span className="font-bold text-sm leading-tight truncate" style={{ color: "#1b4332" }}>{p.name}</span>
              {moved !== 0 && (
                <span className="text-[10px] font-bold shrink-0"
                  style={{ color: moved > 0 ? "#16a34a" : "#dc2626" }}>
                  {moved > 0 ? `▲${moved}` : `▼${Math.abs(moved)}`}
                </span>
              )}
            </div>

            <div className="col-span-2 text-center hidden sm:block text-sm" style={{ color: "#9a9a9a" }}>{p.base}</div>

            <div className="col-span-2 text-center hidden sm:block text-sm font-semibold">
              {p.delta > 0 ? <span style={{ color: "#16a34a" }}>+{p.delta}</span>
               : p.delta < 0 ? <span style={{ color: "#dc2626" }}>{p.delta}</span>
               : <span style={{ color: "#9a9a9a" }}>—</span>}
            </div>

            <div className="col-span-6 sm:col-span-3 text-right">
              <div>
                <span className="text-2xl font-black"
                  style={{ color: isPostGame ? "#1b4332" : p.delta > 0 ? "#dc2626" : p.delta < 0 ? "#9a9a9a" : "#1b4332" }}>
                  {p.live}
                </span>
                <span className="text-xs ml-1" style={{ color: "#5a5a5a" }}>pts</span>
              </div>
              {prize !== null && (
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  {tied && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: "rgba(234,179,8,0.15)", color: "#a16207" }}>
                      dividido
                    </span>
                  )}
                  <span className="text-sm font-bold" style={{ color: "#16a34a" }}>{formatBRL(prize)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-center pb-1" style={{ color: "#9a9a9a" }}>
        {isPostGame
          ? "Ranking pós-jogo · pontuação provisória baseada no resultado final"
          : "Ranking provisório · prêmios calculados sobre o placar atual"}
      </p>
    </div>
  );
}
