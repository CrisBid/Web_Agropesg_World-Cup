import { getParticipants, getPredictions, getResults } from "@/lib/data";
import { calcTotalPoints } from "@/lib/scoring";
import { GAMES } from "@/lib/games-data";
import type { Phase } from "@/lib/games-data";

export async function GET() {
  const [participants, results] = await Promise.all([getParticipants(), getResults()]);

  const gamesPhaseMap: Record<number, Phase> = {};
  for (const g of GAMES) gamesPhaseMap[g.id] = g.phase;

  const ranking = await Promise.all(
    participants.map(async (p) => {
      const predictions = await getPredictions(p.id);
      const { total, bonuses } = calcTotalPoints(predictions, results, gamesPhaseMap);
      return {
        id: p.id,
        name: p.name,
        total,
        bonuses,
        champion: predictions.champion,
        thirdPlace: predictions.thirdPlace,
      };
    })
  );

  ranking.sort((a, b) => b.total - a.total);

  return Response.json(ranking);
}
