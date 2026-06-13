"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface PodiumEntry {
  id: string;
  name: string;
  total: number;
  champion?: string | null;
}

interface LiveEntry {
  id: string;
  name: string;
  base: number;
  live: number;
  delta: number;
}

interface LiveRankingResponse {
  live: boolean;
  ranking: LiveEntry[];
  clientPollMs?: number;
}

const PRIZES_CENTS = [220000, 80000, 50000, 20000, 10000];

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉", 4: "4️⃣", 5: "5️⃣" };

const PODIUM_STYLE: Record<number, { bg: string; border: string }> = {
  1: { bg: "rgba(201,168,76,0.10)", border: "rgba(201,168,76,0.30)" },
  2: { bg: "rgba(160,160,170,0.10)", border: "rgba(160,160,170,0.30)" },
  3: { bg: "rgba(180,120,60,0.10)", border: "rgba(180,120,60,0.30)" },
  4: { bg: "rgba(27,67,50,0.04)", border: "rgba(27,67,50,0.12)" },
  5: { bg: "rgba(27,67,50,0.04)", border: "rgba(27,67,50,0.12)" },
};

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function densePos(ranking: { pts: number }[], i: number): number {
  return new Set(ranking.filter((p) => p.pts > ranking[i].pts).map((p) => p.pts)).size + 1;
}

interface PositionGroup {
  pos: number;
  pts: number;
  prize: number | null;
  delta?: number;
  people: { id: string; name: string; champion?: string | null; delta?: number }[];
  tied: boolean;
}

function buildGroups(
  entries: { id: string; name: string; pts: number; champion?: string | null; delta?: number }[]
): PositionGroup[] {
  const sorted = [...entries].sort((a, b) => b.pts - a.pts);
  const withPos = sorted.map((e, i, arr) => ({ ...e, pos: densePos(arr.map((x) => ({ pts: x.pts })), i) }));

  const groups: PositionGroup[] = [];
  for (const pos of [1, 2, 3, 4, 5]) {
    const inPos = withPos.filter((e) => e.pos === pos);
    if (inPos.length === 0) continue;
    const tiedCount = inPos.length;
    const prize = pos <= PRIZES_CENTS.length ? Math.round(PRIZES_CENTS[pos - 1] / tiedCount) : null;
    groups.push({
      pos,
      pts: inPos[0].pts,
      prize,
      tied: tiedCount > 1,
      people: inPos.map((e) => ({ id: e.id, name: e.name, champion: e.champion, delta: e.delta })),
    });
  }
  return groups;
}

interface Props {
  baseEntries: PodiumEntry[];
}

export default function LivePodium({ baseEntries }: Props) {
  const [liveData, setLiveData] = useState<LiveRankingResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch("/api/live-ranking", { cache: "no-store" });
        if (res.ok && !cancelled) {
          const json: LiveRankingResponse = await res.json();
          setLiveData(json);
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

  const isLive = liveData?.live === true && (liveData.ranking?.length ?? 0) > 0;

  // Build display entries — live scores when active, base otherwise
  const championMap = Object.fromEntries(baseEntries.map((e) => [e.id, e.champion]));

  const displayEntries = isLive
    ? liveData!.ranking.map((e) => ({
        id: e.id, name: e.name, pts: e.live, champion: championMap[e.id], delta: e.delta,
      }))
    : baseEntries.map((e) => ({ id: e.id, name: e.name, pts: e.total, champion: e.champion }));

  const groups = buildGroups(displayEntries);
  const top3 = groups.filter((g) => g.pos <= 3);
  const bottom2 = groups.filter((g) => g.pos >= 4);

  if (groups.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
          Pódio Atual
        </h2>
        {isLive && (
          <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#dc2626" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            Ao vivo
          </span>
        )}
      </div>

      {/* Top 3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {top3.map(({ pos, pts, prize, tied, people }) => {
            const s = PODIUM_STYLE[pos];
            return (
              <div key={pos} className="rounded-[20px] p-6 border"
                style={{ backgroundColor: s.bg, borderColor: s.border }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{MEDAL[pos]}</span>
                  <div className="text-right">
                    <p className="text-3xl font-black" style={{ color: "#1b4332" }}>{pts}</p>
                    <p className="text-xs" style={{ color: "#5a5a5a" }}>pontos</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {people.map((p) => (
                    <Link key={p.id} href={`/palpites/${p.id}`}
                      className="block rounded-[12px] px-3 py-2 transition-all hover:opacity-70"
                      style={{ backgroundColor: "rgba(255,255,255,0.55)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-sm leading-snug" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
                          {p.name}
                        </p>
                        {isLive && p.delta !== undefined && p.delta !== 0 && (
                          <span className="text-[10px] font-bold shrink-0"
                            style={{ color: p.delta > 0 ? "#16a34a" : "#dc2626" }}>
                            {p.delta > 0 ? `+${p.delta}` : p.delta}
                          </span>
                        )}
                      </div>
                      {p.champion && (
                        <p className="text-xs mt-0.5" style={{ color: "#c9a84c" }}>🏆 {p.champion}</p>
                      )}
                    </Link>
                  ))}
                </div>
                {prize !== null && (
                  <div className="flex items-center gap-1.5 mt-4 pt-3" style={{ borderTop: `1px solid ${s.border}` }}>
                    <span className="text-sm font-bold" style={{ color: "#16a34a" }}>{formatBRL(prize)}</span>
                    {tied && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: "rgba(234,179,8,0.15)", color: "#a16207" }}>
                        cada (dividido)
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4º e 5º */}
      {bottom2.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bottom2.map(({ pos, pts, prize, tied, people }) => {
            const s = PODIUM_STYLE[pos];
            return (
              <div key={pos} className="rounded-[20px] p-5 border"
                style={{ backgroundColor: s.bg, borderColor: s.border }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{MEDAL[pos]}</span>
                  <div className="text-right">
                    <p className="text-xl font-black" style={{ color: "#1b4332" }}>{pts}</p>
                    <p className="text-xs" style={{ color: "#5a5a5a" }}>pontos</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {people.map((p) => (
                    <Link key={p.id} href={`/palpites/${p.id}`}
                      className="block rounded-[10px] px-3 py-2 transition-all hover:opacity-70"
                      style={{ backgroundColor: "rgba(255,255,255,0.55)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm leading-snug" style={{ color: "#1b4332" }}>
                          {p.name}
                        </p>
                        {isLive && p.delta !== undefined && p.delta !== 0 && (
                          <span className="text-[10px] font-bold shrink-0"
                            style={{ color: p.delta > 0 ? "#16a34a" : "#dc2626" }}>
                            {p.delta > 0 ? `+${p.delta}` : p.delta}
                          </span>
                        )}
                      </div>
                      {p.champion && (
                        <p className="text-xs mt-0.5" style={{ color: "#c9a84c" }}>🏆 {p.champion}</p>
                      )}
                    </Link>
                  ))}
                </div>
                {prize !== null && (
                  <div className="flex items-center gap-1.5 mt-3 pt-2.5" style={{ borderTop: `1px solid ${s.border}` }}>
                    <span className="text-sm font-bold" style={{ color: "#16a34a" }}>{formatBRL(prize)}</span>
                    {tied && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: "rgba(234,179,8,0.15)", color: "#a16207" }}>
                        cada (dividido)
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="text-right">
        <Link href="/ranking" className="text-sm font-semibold transition-colors hover:opacity-70"
          style={{ color: "#2d6a4f" }}>
          Ver ranking completo →
        </Link>
      </div>
    </section>
  );
}
