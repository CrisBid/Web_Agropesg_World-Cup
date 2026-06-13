import Link from "next/link";
import { getResults } from "@/lib/data";
import { GAMES, PHASE_LABELS } from "@/lib/games-data";
import type { Phase } from "@/lib/games-data";
import GameCard from "@/app/components/GameCard";
import type { ActualResults } from "@/lib/scoring";

export const dynamic = "force-dynamic";

function todayBRT(): string {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${days[d.getUTCDay()]}, ${day} de ${months[month - 1]}`;
}

function getGameResult(gameId: number, phase: Phase, results: ActualResults) {
  if (phase === "grupos") return results.groups[gameId];
  return results.knockout[gameId];
}

// Group games by phase then by date within each phase
function groupByPhaseAndDate(games: typeof GAMES) {
  const phases: Phase[] = ["grupos", "fase32", "oitavas", "quartas", "semis", "terceiro", "final"];
  const result: { phase: Phase; dates: { date: string; games: typeof GAMES }[] }[] = [];

  for (const phase of phases) {
    const phaseGames = games.filter((g) => g.phase === phase);
    if (phaseGames.length === 0) continue;

    const dateMap = new Map<string, typeof GAMES>();
    for (const g of phaseGames) {
      const d = g.date.slice(0, 10);
      if (!dateMap.has(d)) dateMap.set(d, []);
      dateMap.get(d)!.push(g);
    }

    const dates = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, games]) => ({ date, games }));

    result.push({ phase, dates });
  }

  return result;
}

export default async function CalendarioPage() {
  const results = await getResults();
  const today = todayBRT();
  const grouped = groupByPhaseAndDate(GAMES);

  const totalPlayed = Object.keys(results.groups).length + Object.keys(results.knockout).length;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "#52b788" }}>
            Copa do Mundo 2026
          </p>
          <h1 className="text-3xl font-black" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
            Calendário
          </h1>
          <p className="text-sm mt-1" style={{ color: "#5a5a5a" }}>
            {totalPlayed} de 104 jogos disputados
          </p>
        </div>
        <Link href="/" className="text-sm transition-colors hover:opacity-70" style={{ color: "#2d6a4f" }}>
          ← Início
        </Link>
      </div>

      {/* Phases */}
      {grouped.map(({ phase, dates }) => (
        <section key={phase} className="space-y-5">
          <h2 className="text-xl font-bold" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
            {PHASE_LABELS[phase]}
          </h2>

          {dates.map(({ date, games }) => {
            const isToday = date === today;
            const isPast = date < today;

            return (
              <div key={date} className="space-y-2">
                {/* Date header */}
                <div className="flex items-center gap-3">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: isToday ? "#dc2626" : isPast ? "#9a9a9a" : "#1b4332" }}
                  >
                    {formatDateBR(date)}
                    {isToday && (
                      <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full align-middle"
                        style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#dc2626" }}>
                        HOJE
                      </span>
                    )}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: "rgba(27,67,50,0.08)" }} />
                </div>

                {/* Game cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {games.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      result={getGameResult(game.id, game.phase, results) ?? undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
