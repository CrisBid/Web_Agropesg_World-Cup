import { getParticipants, getResults, getPredictions, getEffectiveGames } from "@/lib/data";
import { PHASE_LABELS, PHASE_POINTS } from "@/lib/games-data";
import type { Phase, Game } from "@/lib/games-data";
import GameAccordion from "./GameAccordion";
import type { GameAccordionData, StatRow, PredGroup } from "./GameAccordion";

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

function groupByPhaseAndDate(games: Game[]) {
  const phases: Phase[] = ["grupos", "fase32", "oitavas", "quartas", "semis", "terceiro", "final"];
  const result: { phase: Phase; dates: { date: string; games: Game[] }[] }[] = [];

  for (const phase of phases) {
    const phaseGames = games.filter((g) => g.phase === phase);
    if (phaseGames.length === 0) continue;
    const dateMap = new Map<string, Game[]>();
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

export default async function JogosPage() {
  const [participants, results, games] = await Promise.all([
    getParticipants(),
    getResults(),
    getEffectiveGames(),
  ]);

  // Fetch all predictions in parallel
  const allPreds = await Promise.all(
    participants.map(async (p) => {
      const preds = await getPredictions(p.id);
      return { name: p.name, preds };
    })
  );

  const today = todayBRT();
  const totalPlayed = Object.keys(results.groups).length + Object.keys(results.knockout).length;
  const grouped = groupByPhaseAndDate(games);

  // Build accordion data for each game
  const accordionData: Record<number, GameAccordionData> = {};

  for (const game of games) {
    const groupResult = game.phase === "grupos" ? results.groups[game.id] : undefined;
    const knockoutResult = game.phase !== "grupos" ? results.knockout[game.id] : undefined;
    const hasResult = groupResult != null || knockoutResult != null;

    // --- Scoring stats (only when result exists) ---
    const stats: StatRow[] = [];

    if (groupResult) {
      const rA = groupResult.scoreA;
      const rB = groupResult.scoreB;
      const actualResult = rA > rB ? "H" : rA < rB ? "A" : "D";
      const actualDiff = rA - rB;

      const resultNames: string[] = [];
      const golsANames: string[] = [];
      const golsBNames: string[] = [];
      const difExataNames: string[] = [];
      const difAbsNames: string[] = [];

      for (const { name, preds } of allPreds) {
        const pred = preds.groups[game.id];
        if (!pred || pred.scoreA === null || pred.scoreB === null) continue;
        const pA = pred.scoreA!;
        const pB = pred.scoreB!;
        const predResult = pA > pB ? "H" : pA < pB ? "A" : "D";
        const predDiff = pA - pB;

        if (predResult === actualResult) resultNames.push(name);
        if (pA === rA) golsANames.push(name);
        if (pB === rB) golsBNames.push(name);
        if (predDiff === actualDiff) difExataNames.push(name);
        if (Math.abs(predDiff) === Math.abs(actualDiff)) difAbsNames.push(name);
      }

      stats.push(
        { label: "Resultado correto (V/E/D)", pts: 3, names: resultNames },
        { label: `Gols ${game.teamA} correto`, pts: 1, names: golsANames },
        { label: `Gols ${game.teamB} correto`, pts: 1, names: golsBNames },
        { label: "Diferença de gols exata", pts: 2, names: difExataNames },
        { label: "Diferença de gols absoluta", pts: 1, names: difAbsNames },
      );
    }

    if (knockoutResult) {
      const correctNames: string[] = [];
      for (const { name, preds } of allPreds) {
        const pred = preds.knockout[game.id];
        if (pred?.winner === knockoutResult.winner) correctNames.push(name);
      }
      const pts = PHASE_POINTS[game.phase];
      stats.push({ label: "Time correto na fase", pts, names: correctNames });
    }

    // --- Prediction distribution ---
    const predMap = new Map<string, string[]>();

    if (game.phase === "grupos") {
      for (const { name, preds } of allPreds) {
        const pred = preds.groups[game.id];
        if (!pred || pred.scoreA === null || pred.scoreB === null) continue;
        const key = `${pred.scoreA}–${pred.scoreB}`;
        if (!predMap.has(key)) predMap.set(key, []);
        predMap.get(key)!.push(name);
      }
    } else {
      for (const { name, preds } of allPreds) {
        const pred = preds.knockout[game.id];
        if (!pred?.winner) continue;
        if (!predMap.has(pred.winner)) predMap.set(pred.winner, []);
        predMap.get(pred.winner)!.push(name);
      }
    }

    // Sort by most popular prediction
    const predGroups: PredGroup[] = Array.from(predMap.entries())
      .map(([prediction, names]) => ({ prediction, names }))
      .sort((a, b) => b.names.length - a.names.length);

    // Result label
    let resultLabel: string | undefined;
    if (groupResult) {
      resultLabel = `${groupResult.scoreA} – ${groupResult.scoreB}`;
    } else if (knockoutResult) {
      resultLabel = knockoutResult.winner;
    }

    const phaseLabel = game.group ? `Grupo ${game.group}` : PHASE_LABELS[game.phase];

    accordionData[game.id] = {
      gameId: game.id,
      num: game.num,
      teamA: game.teamA,
      teamB: game.teamB,
      time: game.date.slice(11, 16),
      phaseLabel,
      resultLabel,
      hasResult,
      totalParticipants: participants.length,
      stats,
      predGroups,
    };
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "#52b788" }}>
          Copa do Mundo 2026
        </p>
        <h1 className="text-3xl font-black" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
          Jogos
        </h1>
        <p className="text-sm mt-1" style={{ color: "#5a5a5a" }}>
          {totalPlayed} de 104 jogos disputados
        </p>
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
                  <span className="text-sm font-semibold"
                    style={{ color: isToday ? "#dc2626" : isPast ? "#9a9a9a" : "#1b4332" }}>
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

                {/* Game accordions */}
                <div className="space-y-1.5">
                  {games.map((game) => (
                    <GameAccordion key={game.id} data={accordionData[game.id]} />
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
