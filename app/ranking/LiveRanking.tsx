"use client";

import { useEffect, useState } from "react";

interface LiveEntry {
  id: string;
  name: string;
  base: number;
  live: number;
  delta: number;
}

interface LiveRankingResponse {
  live: boolean;
  liveGameIds?: number[];
  ranking: LiveEntry[];
  clientPollMs?: number;
}

interface Props {
  baseRanking: { id: string; name: string; total: number }[];
}

const PRIZES_CENTS = [220000, 80000, 50000, 20000, 10000];

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function densePosition(ranking: { live: number }[], i: number): number {
  const distinctHigher = new Set(
    ranking.filter((p) => p.live > ranking[i].live).map((p) => p.live)
  ).size;
  return distinctHigher + 1;
}

function calcPrizes(ranking: { live: number }[]): (number | null)[] {
  const prizes: (number | null)[] = new Array(ranking.length).fill(null);
  for (let i = 0; i < ranking.length; i++) {
    const pos = densePosition(ranking, i);
    if (pos > PRIZES_CENTS.length) continue;
    const tiedCount = ranking.filter((p) => p.live === ranking[i].live).length;
    prizes[i] = Math.round(PRIZES_CENTS[pos - 1] / tiedCount);
  }
  return prizes;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉", 4: "4️⃣", 5: "5️⃣" };

export default function LiveRanking({ baseRanking }: Props) {
  const [data, setData] = useState<LiveRankingResponse | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch("/api/live-ranking", { cache: "no-store" });
        if (res.ok && !cancelled) {
          const json: LiveRankingResponse = await res.json();
          setData(json);
          if (json.live) setLastUpdate(new Date());
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
  }, []);

  if (!data?.live || data.ranking.length === 0) return null;

  const ranking = data.ranking;
  const positions = ranking.map((_, i) => densePosition(ranking, i));
  const prizes = calcPrizes(ranking);

  function isTied(i: number): boolean {
    const pos = positions[i];
    if (pos > PRIZES_CENTS.length) return false;
    return ranking.filter((p) => p.live === ranking[i].live).length > 1;
  }

  // Posição densa do ranking base para calcular a movimentação
  function baseDensePos(participantId: string): number {
    const sorted = [...baseRanking].sort((a, b) => b.total - a.total);
    const idx = sorted.findIndex((b) => b.id === participantId);
    if (idx === -1) return 999;
    const distinctHigher = new Set(
      sorted.filter((p) => p.total > sorted[idx].total).map((p) => p.total)
    ).size;
    return distinctHigher + 1;
  }

  return (
    <div className="space-y-3 mt-1">
      {/* Live header */}
      <div className="flex items-center gap-3 px-1">
        <span
          className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#dc2626" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
          Ranking ao vivo
        </span>
        {lastUpdate && (
          <span className="text-xs" style={{ color: "#9a9a9a" }}>
            atualizado às {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-12 gap-2 px-5 text-xs font-semibold uppercase tracking-wide" style={{ color: "#5a5a5a" }}>
        <div className="col-span-1">#</div>
        <div className="col-span-5 sm:col-span-4">Participante</div>
        <div className="col-span-2 text-center hidden sm:block">Base</div>
        <div className="col-span-2 text-center hidden sm:block">Ao vivo</div>
        <div className="col-span-6 sm:col-span-3 text-right">Total / Prêmio</div>
      </div>

      {ranking.map((p, i) => {
        const pos = positions[i];
        const prize = prizes[i];
        const tied = isTied(i);
        const basePos = baseDensePos(p.id);
        const moved = basePos - pos; // positivo = subiu, negativo = caiu

        return (
          <div
            key={p.id}
            className="grid grid-cols-12 gap-2 items-center rounded-[16px] border px-5 py-4 transition-all"
            style={{
              backgroundColor: pos === 1 ? "rgba(220,38,38,0.04)" : "white",
              borderColor:
                pos === 1 ? "rgba(220,38,38,0.25)"
                : pos === 2 ? "rgba(160,160,170,0.25)"
                : pos === 3 ? "rgba(180,120,60,0.20)"
                : "rgba(27,67,50,0.08)",
            }}
          >
            {/* Posição */}
            <div className="col-span-1 text-xl font-bold">
              {MEDAL[pos] ?? (
                <span className="text-sm font-bold" style={{ color: "#5a5a5a" }}>{pos}º</span>
              )}
            </div>

            {/* Nome + indicador de movimento */}
            <div className="col-span-5 sm:col-span-4 flex items-center gap-2 min-w-0">
              <span className="font-bold text-sm leading-tight truncate" style={{ color: "#1b4332" }}>
                {p.name}
              </span>
              {moved !== 0 && (
                <span
                  className="text-[10px] font-bold shrink-0"
                  style={{ color: moved > 0 ? "#16a34a" : "#dc2626" }}
                >
                  {moved > 0 ? `▲${moved}` : `▼${Math.abs(moved)}`}
                </span>
              )}
            </div>

            {/* Pts base */}
            <div className="col-span-2 text-center hidden sm:block text-sm" style={{ color: "#9a9a9a" }}>
              {p.base}
            </div>

            {/* Delta ao vivo */}
            <div className="col-span-2 text-center hidden sm:block text-sm font-semibold">
              {p.delta > 0 ? (
                <span style={{ color: "#16a34a" }}>+{p.delta}</span>
              ) : p.delta < 0 ? (
                <span style={{ color: "#dc2626" }}>{p.delta}</span>
              ) : (
                <span style={{ color: "#9a9a9a" }}>—</span>
              )}
            </div>

            {/* Total + prêmio */}
            <div className="col-span-6 sm:col-span-3 text-right">
              <div>
                <span
                  className="text-2xl font-black"
                  style={{ color: p.delta > 0 ? "#dc2626" : p.delta < 0 ? "#9a9a9a" : "#1b4332" }}
                >
                  {p.live}
                </span>
                <span className="text-xs ml-1" style={{ color: "#5a5a5a" }}>pts</span>
              </div>
              {prize !== null && (
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  {tied && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: "rgba(234,179,8,0.15)", color: "#a16207" }}
                    >
                      dividido
                    </span>
                  )}
                  <span className="text-sm font-bold" style={{ color: "#16a34a" }}>
                    {formatBRL(prize)}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-center pb-1" style={{ color: "#9a9a9a" }}>
        Ranking provisório · prêmios calculados sobre o placar atual · atualiza a cada 30 s
      </p>
    </div>
  );
}
