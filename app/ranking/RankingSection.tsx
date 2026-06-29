"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import LiveRanking from "./LiveRanking";

const PRIZES_CENTS = [220000, 80000, 50000, 20000, 10000];
const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface RankingEntry {
  id: string;
  name: string;
  total: number;
  groupPts: number;
  knockoutPts: number;
  classifyPts: number;
  bonusPts: number;
  champion?: string | null;
  prize: number | null;
  tied: boolean;
  pos: number;
}

interface Props {
  entries: RankingEntry[];
  onLiveChange?: (isLive: boolean) => void;
}

export default function RankingSection({ entries, onLiveChange }: Props) {
  const [accordionOpen, setAccordionOpen] = useState(true);
  const [liveActivated, setLiveActivated] = useState(false);

  const handleLiveChange = useCallback((isLive: boolean) => {
    if (isLive && !liveActivated) {
      setLiveActivated(true);
      setAccordionOpen(false);
    }
    onLiveChange?.(isLive);
  }, [liveActivated, onLiveChange]);

  const baseRanking = entries.map((e) => ({ id: e.id, name: e.name, total: e.total }));

  if (entries.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed p-16 text-center"
        style={{ borderColor: "rgba(27,67,50,0.2)" }}>
        <div className="text-5xl mb-3">🏆</div>
        <p style={{ color: "#5a5a5a" }}>Nenhum participante cadastrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live ranking */}
      <LiveRanking baseRanking={baseRanking} onLiveChange={handleLiveChange} />

      {/* Base ranking accordion */}
      <div className="rounded-[20px] border overflow-hidden"
        style={{ borderColor: "rgba(27,67,50,0.08)" }}>

        {/* Accordion header */}
        <button
          onClick={() => setAccordionOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#1b4332]/4"
          style={{ backgroundColor: accordionOpen ? "rgba(27,67,50,0.03)" : "white" }}
        >
          <div className="flex items-center gap-3">
            <span className="font-bold text-base" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
              Ranking Oficial
            </span>
            {liveActivated && !accordionOpen && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(27,67,50,0.08)", color: "#5a5a5a" }}>
                minimizado durante o ao vivo
              </span>
            )}
          </div>
          <span
            className="text-sm transition-transform duration-200"
            style={{ display: "inline-block", transform: accordionOpen ? "rotate(180deg)" : "none", color: "#5a5a5a" }}
          >
            ▾
          </span>
        </button>

        {/* Accordion content */}
        {accordionOpen && (
          <div className="border-t px-5 pt-4 pb-5 space-y-3"
            style={{ borderColor: "rgba(27,67,50,0.08)" }}>

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 px-0 text-xs font-semibold uppercase tracking-wide"
              style={{ color: "#5a5a5a" }}>
              <div className="col-span-1">#</div>
              <div className="col-span-5 sm:col-span-2">Participante</div>
              <div className="col-span-2 text-center hidden sm:block">Grupos</div>
              <div className="col-span-2 text-center hidden sm:block">Classif. F32</div>
              <div className="col-span-2 text-center hidden sm:block">Mata-mata</div>
              <div className="col-span-1 text-center hidden sm:block">Bônus</div>
              <div className="col-span-6 sm:col-span-2 text-right">Total / Prêmio</div>
            </div>

            {entries.map((p) => (
              <Link key={p.id} href={`/palpites/${p.id}`}
                className="grid grid-cols-12 gap-2 items-center rounded-[16px] border px-5 py-4 transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{
                  backgroundColor: p.pos === 1 ? "rgba(201,168,76,0.06)" : "white",
                  borderColor: p.pos === 1 ? "rgba(201,168,76,0.35)"
                    : p.pos === 2 ? "rgba(160,160,170,0.25)"
                    : p.pos === 3 ? "rgba(180,120,60,0.20)"
                    : "rgba(27,67,50,0.08)",
                }}>

                <div className="col-span-1 text-xl font-bold">
                  {MEDAL[p.pos] ?? (
                    <span className="text-sm font-bold" style={{ color: "#5a5a5a" }}>{p.pos}º</span>
                  )}
                </div>

                <div className="col-span-5 sm:col-span-2">
                  <p className="font-bold text-sm leading-tight" style={{ color: "#1b4332" }}>{p.name}</p>
                  {p.champion && (
                    <p className="text-xs mt-0.5" style={{ color: "#c9a84c" }}>🏆 {p.champion}</p>
                  )}
                </div>

                <div className="col-span-2 text-center hidden sm:block text-sm font-semibold" style={{ color: "#5a5a5a" }}>
                  {p.groupPts}
                </div>
                <div className="col-span-2 text-center hidden sm:block text-sm font-semibold" style={{ color: "#52b788" }}>
                  {p.classifyPts > 0 ? p.classifyPts : "—"}
                </div>
                <div className="col-span-2 text-center hidden sm:block text-sm font-semibold" style={{ color: "#5a5a5a" }}>
                  {p.knockoutPts}
                </div>
                <div className="col-span-1 text-center hidden sm:block text-sm font-semibold" style={{ color: "#c9a84c" }}>
                  {p.bonusPts > 0 ? `+${p.bonusPts}` : "—"}
                </div>

                <div className="col-span-6 sm:col-span-2 text-right">
                  <div>
                    <span className="text-2xl font-black" style={{ color: "#1b4332" }}>{p.total}</span>
                    <span className="text-xs ml-1" style={{ color: "#5a5a5a" }}>pts</span>
                  </div>
                  {p.prize !== null && (
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {p.tied && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: "rgba(234,179,8,0.15)", color: "#a16207" }}>
                          dividido
                        </span>
                      )}
                      <span className="text-sm font-bold" style={{ color: "#16a34a" }}>
                        {formatBRL(p.prize)}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}

            {/* Legend */}
            <div className="rounded-[16px] border p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm mt-2"
              style={{ backgroundColor: "rgba(27,67,50,0.02)", borderColor: "rgba(27,67,50,0.06)" }}>
              <div className="flex gap-3 items-start">
                <span className="text-xl shrink-0">⚽</span>
                <div>
                  <p className="font-semibold" style={{ color: "#1b4332" }}>Grupos</p>
                  <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>Pontos dos 72 jogos da fase de grupos</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-xl shrink-0">🎯</span>
                <div>
                  <p className="font-semibold" style={{ color: "#52b788" }}>Classif. F32</p>
                  <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>3 pts por time acertado na Fase de 32</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-xl shrink-0">🏅</span>
                <div>
                  <p className="font-semibold" style={{ color: "#1b4332" }}>Mata-mata</p>
                  <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>Pontos pelas fases eliminatórias</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-xl shrink-0">🏆</span>
                <div>
                  <p className="font-semibold" style={{ color: "#c9a84c" }}>Bônus</p>
                  <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>Campeão (15 pts) + 3º lugar (10 pts)</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
