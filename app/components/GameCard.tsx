import type { Game } from "@/lib/games-data";
import { PHASE_LABELS } from "@/lib/games-data";

export interface GameResult {
  scoreA?: number | null;
  scoreB?: number | null;
  winner?: string;
}

interface Props {
  game: Game;
  result?: GameResult;
  compact?: boolean;
}

export default function GameCard({ game, result, compact = false }: Props) {
  const time = game.date.slice(11, 16);
  const hasResult = result != null && result.scoreA != null && result.scoreB != null;
  const isTBD = game.teamA === "TBD";
  const phaseLabel = game.group ? `Grupo ${game.group}` : PHASE_LABELS[game.phase];

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 rounded-[12px] border px-4 py-3"
        style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}
      >
        <span className="text-xs font-bold w-11 shrink-0 tabular-nums" style={{ color: "#5a5a5a" }}>
          {time}h
        </span>
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
          <span className="font-semibold text-sm truncate" style={{ color: isTBD ? "#9a9a9a" : "#1b4332" }}>
            {game.teamA}
          </span>
          {hasResult ? (
            <span className="font-black text-base shrink-0 tabular-nums px-1" style={{ color: "#1b4332" }}>
              {result.scoreA} — {result.scoreB}
            </span>
          ) : (
            <span className="text-xs shrink-0 px-1" style={{ color: "#9a9a9a" }}>vs</span>
          )}
          <span className="font-semibold text-sm truncate text-right" style={{ color: isTBD ? "#9a9a9a" : "#1b4332" }}>
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

  return (
    <div
      className="flex items-center gap-2 sm:gap-3 rounded-[14px] border px-3 sm:px-4 py-3.5"
      style={{
        backgroundColor: hasResult ? "white" : "#fafcfa",
        borderColor: hasResult ? "rgba(27,67,50,0.10)" : "rgba(27,67,50,0.06)",
      }}
    >
      <span className="text-[10px] font-bold w-5 shrink-0 text-center" style={{ color: "#c8c8c8" }}>
        {game.num}
      </span>
      <span className="text-xs font-bold w-11 shrink-0 tabular-nums" style={{ color: "#5a5a5a" }}>
        {time}h
      </span>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
        <span className="font-semibold text-sm truncate" style={{ color: isTBD ? "#9a9a9a" : "#1b4332" }}>
          {game.teamA}
        </span>
        {hasResult ? (
          <span className="font-black text-lg shrink-0 tabular-nums" style={{ color: "#1b4332" }}>
            {result.scoreA} — {result.scoreB}
          </span>
        ) : (
          <span className="text-xs shrink-0" style={{ color: "#c8c8c8" }}>vs</span>
        )}
        <span className="font-semibold text-sm truncate text-right" style={{ color: isTBD ? "#9a9a9a" : "#1b4332" }}>
          {game.teamB}
        </span>
      </div>
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 hidden sm:inline"
        style={{ backgroundColor: "rgba(82,183,136,0.10)", color: "#2d6a4f" }}
      >
        {phaseLabel}
      </span>
    </div>
  );
}
