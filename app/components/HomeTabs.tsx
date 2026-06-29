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

// ─── Bracket Layout Constants ─────────────────────────────────────────────────

const TOTAL_H  = 640;
const GAME_H   = 52;
const COL_W    = 128;
const CONN_W   = 24;
const CENTER_W = 192; // 24 conn + 144 final card + 24 conn
const FINAL_W  = 144;
const HALF_W   = COL_W * 4 + CONN_W * 3; // 584
const TOTAL_W  = HALF_W * 2 + CENTER_W;   // 1360

// Left half column X positions (left edge of each game column)
const LX = {
  fase32:  0,
  oitavas: COL_W + CONN_W,          // 152
  quartas: COL_W * 2 + CONN_W * 2,  // 304
  semi:    COL_W * 3 + CONN_W * 3,  // 456
};

// Right half column X positions (left edge)
const RX = {
  semi:    HALF_W + CENTER_W,                             // 776
  quartas: HALF_W + CENTER_W + COL_W + CONN_W,           // 928
  oitavas: HALF_W + CENTER_W + COL_W * 2 + CONN_W * 2,  // 1080
  fase32:  HALF_W + CENTER_W + COL_W * 3 + CONN_W * 3,  // 1232
};

const FINAL_X = HALF_W + CONN_W; // 608

// Game order top-to-bottom for each half
const L_FASE32  = [74, 77, 73, 75, 83, 84, 81, 82];
const L_OITAVAS = [89, 90, 93, 94];
const L_QUARTAS = [97, 98];
const L_SEMI    = [101];
const R_SEMI    = [102];
const R_QUARTAS = [99, 100];
const R_OITAVAS = [91, 92, 95, 96];
const R_FASE32  = [76, 78, 79, 80, 86, 88, 85, 87];
const FINAL_ID  = 104;
const THIRD_ID  = 103;

// Short labels for bracket column headers
const ROUND_LABELS: Record<string, string> = {
  fase32:  "Fase 32",
  oitavas: "Oitavas",
  quartas: "Quartas",
  semi:    "Semi",
};

// Center Y for item i when n items are space-around in TOTAL_H
function cy(n: number, i: number): number {
  return (TOTAL_H * (2 * i + 1)) / (2 * n);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSlotDate(dateStr: string): string {
  const [, month, day] = dateStr.slice(0, 10).split("-").map(Number);
  const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${day} ${months[month - 1]}`;
}

// ─── Bracket Slot Card ────────────────────────────────────────────────────────

function BracketSlot({ game, width }: { game: BracketGame | undefined; width: number }) {
  if (!game) {
    return (
      <div
        style={{
          width,
          height: GAME_H,
          borderRadius: 8,
          border: "1px dashed rgba(27,67,50,0.10)",
          backgroundColor: "rgba(27,67,50,0.015)",
        }}
      />
    );
  }

  const winner = game.result?.winner;
  const tbdA = !game.teamA || game.teamA === "TBD";
  const tbdB = !game.teamB || game.teamB === "TBD";
  const winA = !!winner && winner === game.teamA;
  const winB = !!winner && winner === game.teamB;
  const time = game.date.slice(11, 16);
  const isScheduled = !tbdA && !tbdB && !winner && time && time !== "00:00";

  return (
    <div
      style={{
        width,
        height: GAME_H,
        borderRadius: 8,
        overflow: "hidden",
        border: `1px solid ${winner ? "rgba(27,67,50,0.22)" : tbdA && tbdB ? "rgba(27,67,50,0.07)" : "rgba(27,67,50,0.13)"}`,
        backgroundColor: winner ? "rgba(27,67,50,0.03)" : "white",
        display: "flex",
        flexDirection: "column",
        boxShadow: winner ? "0 1px 4px rgba(0,0,0,0.07)" : "none",
      }}
    >
      {/* Team A */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          paddingInline: 7,
          gap: 4,
          backgroundColor: winA ? "rgba(45,106,79,0.09)" : "transparent",
          borderBottom: "1px solid rgba(27,67,50,0.06)",
        }}
      >
        <span
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: winA ? 800 : 600,
            color: tbdA ? "#c8c8c8" : winA ? "#2d6a4f" : "#1b1b1b",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.1,
          }}
        >
          {tbdA ? "—" : game.teamA}
        </span>
        {winA && (
          <span style={{ fontSize: 10, color: "#2d6a4f", flexShrink: 0 }}>
            ✓
          </span>
        )}
      </div>

      {/* Team B */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          paddingInline: 7,
          gap: 4,
          backgroundColor: winB ? "rgba(45,106,79,0.09)" : "transparent",
        }}
      >
        <span
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: winB ? 800 : 600,
            color: tbdB ? "#c8c8c8" : winB ? "#2d6a4f" : "#1b1b1b",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.1,
          }}
        >
          {tbdB ? "—" : game.teamB}
        </span>
        {winB && (
          <span style={{ fontSize: 10, color: "#2d6a4f", flexShrink: 0 }}>
            ✓
          </span>
        )}
      </div>

      {/* Date + time footer */}
      {isScheduled && (
        <div
          style={{
            paddingInline: 7,
            paddingBlock: 2,
            fontSize: 9,
            color: "#b0b0b0",
            textAlign: "right",
            borderTop: "1px solid rgba(27,67,50,0.05)",
            backgroundColor: "rgba(27,67,50,0.01)",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {formatSlotDate(game.date)} · {time}h
        </div>
      )}
    </div>
  );
}

// ─── Visual Bracket ───────────────────────────────────────────────────────────

function VisualBracket({ bracketGames }: { bracketGames: BracketGame[] }) {
  const gameMap = new Map(bracketGames.map((g) => [g.id, g]));
  const finalY = TOTAL_H / 2; // 320

  // Build SVG connector paths
  const paths: string[] = [];

  // Left half: each round feeds into the next (arms go RIGHT)
  const leftRounds = [
    { ids: L_FASE32,  x: LX.fase32  },
    { ids: L_OITAVAS, x: LX.oitavas },
    { ids: L_QUARTAS, x: LX.quartas },
    { ids: L_SEMI,    x: LX.semi    },
  ];
  for (let r = 0; r < leftRounds.length - 1; r++) {
    const curr = leftRounds[r];
    const next = leftRounds[r + 1];
    for (let j = 0; j < next.ids.length; j++) {
      const y1   = cy(curr.ids.length, j * 2);
      const y2   = cy(curr.ids.length, j * 2 + 1);
      const yOut = cy(next.ids.length, j);
      const x1   = curr.x + COL_W;  // right edge of curr
      const xm   = x1 + CONN_W / 2;
      const x2   = next.x;          // left edge of next
      // H x1 at the end draws the bottom arm back to the second feeder game
      paths.push(`M ${x1} ${y1} H ${xm} V ${y2} H ${x1} M ${xm} ${yOut} H ${x2}`);
    }
  }
  // Semi-L → Final
  paths.push(`M ${LX.semi + COL_W} ${finalY} H ${FINAL_X}`);

  // Right half: arms go LEFT (inward toward center)
  const rightRounds = [
    { ids: R_FASE32,  x: RX.fase32  },
    { ids: R_OITAVAS, x: RX.oitavas },
    { ids: R_QUARTAS, x: RX.quartas },
    { ids: R_SEMI,    x: RX.semi    },
  ];
  for (let r = 0; r < rightRounds.length - 1; r++) {
    const curr = rightRounds[r];
    const next = rightRounds[r + 1];
    for (let j = 0; j < next.ids.length; j++) {
      const y1   = cy(curr.ids.length, j * 2);
      const y2   = cy(curr.ids.length, j * 2 + 1);
      const yOut = cy(next.ids.length, j);
      const x1   = curr.x;           // left edge of curr
      const xm   = x1 - CONN_W / 2;
      const x2   = next.x + COL_W;  // right edge of next
      // H x1 draws the bottom arm back to the second feeder game
      paths.push(`M ${x1} ${y1} H ${xm} V ${y2} H ${x1} M ${xm} ${yOut} H ${x2}`);
    }
  }
  // Semi-R → Final
  paths.push(`M ${RX.semi} ${finalY} H ${FINAL_X + FINAL_W}`);

  const LABEL_H = 22;

  return (
    <div style={{ overflowX: "auto", width: "100%", paddingBottom: 8 }}>
      <div style={{ width: TOTAL_W }}>
        {/* Phase column headers */}
        <div style={{ position: "relative", height: LABEL_H, marginBottom: 6 }}>
          {(Object.entries(LX) as [string, number][]).map(([ph, x]) => (
            <div
              key={`lh-${ph}`}
              style={{
                position: "absolute",
                left: x,
                width: COL_W,
                textAlign: "center",
                fontSize: 9,
                fontWeight: 700,
                color: "#9a9a9a",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                lineHeight: `${LABEL_H}px`,
              }}
            >
              {ROUND_LABELS[ph]}
            </div>
          ))}

          {/* Center: Final label */}
          <div
            style={{
              position: "absolute",
              left: FINAL_X,
              width: FINAL_W,
              textAlign: "center",
              fontSize: 9,
              fontWeight: 700,
              color: "#92610a",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              lineHeight: `${LABEL_H}px`,
            }}
          >
            Final
          </div>

          {(Object.entries(RX) as [string, number][]).map(([ph, x]) => (
            <div
              key={`rh-${ph}`}
              style={{
                position: "absolute",
                left: x,
                width: COL_W,
                textAlign: "center",
                fontSize: 9,
                fontWeight: 700,
                color: "#9a9a9a",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                lineHeight: `${LABEL_H}px`,
              }}
            >
              {ROUND_LABELS[ph]}
            </div>
          ))}
        </div>

        {/* Bracket area */}
        <div style={{ position: "relative", height: TOTAL_H }}>
          {/* SVG connector lines */}
          <svg
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            width={TOTAL_W}
            height={TOTAL_H}
          >
            {paths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="rgba(27,67,50,0.18)"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {/* Left half game cards */}
          {leftRounds.map(({ ids, x }) =>
            ids.map((id, i) => (
              <div
                key={`lc-${id}`}
                style={{
                  position: "absolute",
                  left: x,
                  top: cy(ids.length, i) - GAME_H / 2,
                  width: COL_W,
                }}
              >
                <BracketSlot game={gameMap.get(id)} width={COL_W} />
              </div>
            ))
          )}

          {/* Right half game cards */}
          {rightRounds.map(({ ids, x }) =>
            ids.map((id, i) => (
              <div
                key={`rc-${id}`}
                style={{
                  position: "absolute",
                  left: x,
                  top: cy(ids.length, i) - GAME_H / 2,
                  width: COL_W,
                }}
              >
                <BracketSlot game={gameMap.get(id)} width={COL_W} />
              </div>
            ))
          )}

          {/* Final */}
          <div
            style={{
              position: "absolute",
              left: FINAL_X,
              top: finalY - GAME_H / 2,
              width: FINAL_W,
            }}
          >
            <BracketSlot game={gameMap.get(FINAL_ID)} width={FINAL_W} />
          </div>

          {/* 3rd place */}
          <div
            style={{
              position: "absolute",
              left: FINAL_X,
              top: finalY + GAME_H / 2 + 18,
              width: FINAL_W,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "#a0a0a0",
                textAlign: "center",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              3º Lugar
            </div>
            <BracketSlot game={gameMap.get(THIRD_ID)} width={FINAL_W} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Upcoming game card ───────────────────────────────────────────────────────

function UpcomingCard({ game }: { game: UpcomingDay["games"][0] }) {
  const time = game.date.slice(11, 16);
  const hasResult = game.result?.scoreA != null;
  const phaseLabel = game.group ? `Grupo ${game.group}` : PHASE_LABELS[game.phase];

  return (
    <div
      className="flex items-center gap-3 rounded-[12px] border px-4 py-3"
      style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}
    >
      <span
        className="text-xs font-bold w-11 shrink-0 tabular-nums"
        style={{ color: "#5a5a5a" }}
      >
        {time}h
      </span>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
        <span
          className="font-semibold text-sm truncate"
          style={{ color: game.teamA === "TBD" ? "#9a9a9a" : "#1b4332" }}
        >
          {game.teamA}
        </span>
        {hasResult ? (
          <span
            className="font-black text-base shrink-0 tabular-nums px-1"
            style={{ color: "#1b4332" }}
          >
            {game.result!.scoreA} — {game.result!.scoreB}
          </span>
        ) : (
          <span className="text-xs shrink-0 px-1" style={{ color: "#9a9a9a" }}>
            vs
          </span>
        )}
        <span
          className="font-semibold text-sm truncate text-right"
          style={{ color: game.teamB === "TBD" ? "#9a9a9a" : "#1b4332" }}
        >
          {game.teamB}
        </span>
      </div>
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "#2d6a4f" }}
      >
        {phaseLabel}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  bracketGames: BracketGame[];
  upcomingDays: UpcomingDay[];
}

export default function HomeTabs({ bracketGames, upcomingDays }: Props) {
  const [tab, setTab] = useState<"bracket" | "games">("bracket");
  const [nextOpen, setNextOpen] = useState(false);

  const todayGroup = upcomingDays.find((d) => d.isToday);
  const nextGroups = upcomingDays.filter((d) => !d.isToday);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="text-2xl font-bold"
          style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}
        >
          Copa 2026
        </h2>
        <Link
          href="/jogos"
          className="text-sm font-semibold transition-colors hover:opacity-70"
          style={{ color: "#2d6a4f" }}
        >
          Todos os jogos →
        </Link>
      </div>

      {/* Tab toggle */}
      <div
        className="flex rounded-full border p-0.5 w-fit gap-0.5"
        style={{
          borderColor: "rgba(27,67,50,0.15)",
          backgroundColor: "rgba(27,67,50,0.03)",
        }}
      >
        {(
          [
            ["bracket", "Chaveamento"],
            ["games", "Próximos dias"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              backgroundColor: tab === key ? "#1b4332" : "transparent",
              color: tab === key ? "white" : "#5a5a5a",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── CHAVEAMENTO ── */}
      {tab === "bracket" && (
        <div>
          {bracketGames.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "#9a9a9a" }}>
              O chaveamento ainda não está disponível.
            </p>
          ) : (
            <VisualBracket bracketGames={bracketGames} />
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
                  <span
                    className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full align-middle"
                    style={{
                      backgroundColor: "rgba(220,38,38,0.12)",
                      color: "#dc2626",
                    }}
                  >
                    {todayGroup.games.length} jogo
                    {todayGroup.games.length !== 1 ? "s" : ""}
                  </span>
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: "rgba(27,67,50,0.08)" }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {todayGroup.games.map((g) => (
                  <UpcomingCard key={g.id} game={g} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "#9a9a9a" }}>
              Nenhum jogo hoje.
            </p>
          )}

          {/* Next days accordion */}
          {nextGroups.length > 0 && (
            <div
              className="rounded-[16px] border overflow-hidden"
              style={{ borderColor: "rgba(27,67,50,0.08)" }}
            >
              <button
                onClick={() => setNextOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold transition-colors hover:bg-[#1b4332]/4"
                style={{
                  backgroundColor: nextOpen ? "rgba(27,67,50,0.04)" : "white",
                  color: "#1b4332",
                }}
              >
                <span>
                  Próximos{" "}
                  {nextGroups.length > 1 ? `${nextGroups.length} dias` : "dias"}
                  <span
                    className="ml-2 text-xs font-normal"
                    style={{ color: "#9a9a9a" }}
                  >
                    ({nextGroups.reduce((s, g) => s + g.games.length, 0)} jogos)
                  </span>
                </span>
                <span
                  className="text-xs transition-transform duration-200"
                  style={{
                    display: "inline-block",
                    transform: nextOpen ? "rotate(180deg)" : "none",
                    color: "#5a5a5a",
                  }}
                >
                  ▾
                </span>
              </button>
              {nextOpen && (
                <div
                  className="px-5 pb-5 pt-3 space-y-4 border-t"
                  style={{
                    borderColor: "rgba(27,67,50,0.08)",
                    backgroundColor: "white",
                  }}
                >
                  {nextGroups.map(({ date, label, games }) => (
                    <div key={date} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "#5a5a5a" }}
                        >
                          {label}
                        </span>
                        <div
                          className="flex-1 h-px"
                          style={{ backgroundColor: "rgba(27,67,50,0.08)" }}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {games.map((g) => (
                          <UpcomingCard key={g.id} game={g} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {upcomingDays.length === 0 && (
            <p className="text-sm" style={{ color: "#9a9a9a" }}>
              Nenhum jogo programado.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
