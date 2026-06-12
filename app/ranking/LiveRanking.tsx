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

const MEDAL = ["🥇", "🥈", "🥉"];

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
          // Sync interval with the server-computed budget
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

  // No live games → render nothing (parent shows the static ranking)
  if (!data?.live || data.ranking.length === 0) return null;

  const ranking = data.ranking;

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
        <div className="col-span-3 text-center hidden sm:block">Base</div>
        <div className="col-span-3 sm:col-span-2 text-center">Ao vivo</div>
        <div className="col-span-3 sm:col-span-2 text-right font-bold">Total</div>
      </div>

      {ranking.map((p, i) => {
        // Find where this participant sits in the base ranking
        const baseIdx = baseRanking.findIndex((b) => b.id === p.id);
        const moved = baseIdx - i; // positive = moved up, negative = moved down

        return (
          <div
            key={p.id}
            className="grid grid-cols-12 gap-2 items-center rounded-[16px] border px-5 py-4 transition-all"
            style={{
              backgroundColor: i === 0 ? "rgba(220,38,38,0.04)" : "white",
              borderColor: i === 0 ? "rgba(220,38,38,0.25)"
                : "rgba(27,67,50,0.08)",
            }}
          >
            <div className="col-span-1 text-xl font-bold">
              {i < 3 ? MEDAL[i] : (
                <span className="text-sm font-bold" style={{ color: "#5a5a5a" }}>{i + 1}º</span>
              )}
            </div>

            <div className="col-span-5 sm:col-span-4 flex items-center gap-2">
              <span className="font-bold text-sm leading-tight" style={{ color: "#1b4332" }}>
                {p.name}
              </span>
              {moved !== 0 && (
                <span
                  className="text-[10px] font-bold"
                  style={{ color: moved > 0 ? "#16a34a" : "#dc2626" }}
                >
                  {moved > 0 ? `▲${moved}` : `▼${Math.abs(moved)}`}
                </span>
              )}
            </div>

            <div className="col-span-3 text-center hidden sm:block text-sm" style={{ color: "#9a9a9a" }}>
              {p.base}
            </div>

            <div className="col-span-3 sm:col-span-2 text-center text-sm font-semibold">
              {p.delta > 0 ? (
                <span style={{ color: "#16a34a" }}>+{p.delta}</span>
              ) : p.delta < 0 ? (
                <span style={{ color: "#dc2626" }}>{p.delta}</span>
              ) : (
                <span style={{ color: "#9a9a9a" }}>—</span>
              )}
            </div>

            <div className="col-span-3 sm:col-span-2 text-right">
              <span
                className="text-2xl font-black"
                style={{ color: p.delta > 0 ? "#dc2626" : p.delta < 0 ? "#9a9a9a" : "#1b4332" }}
              >
                {p.live}
              </span>
              <span className="text-xs ml-1" style={{ color: "#5a5a5a" }}>pts</span>
            </div>
          </div>
        );
      })}

      <p className="text-xs text-center pb-1" style={{ color: "#9a9a9a" }}>
        Ranking provisório baseado no placar atual · atualiza a cada 30 segundos
      </p>
    </div>
  );
}
