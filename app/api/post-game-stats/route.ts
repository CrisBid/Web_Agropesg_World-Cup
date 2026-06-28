import { getParticipants, getResults, getPredictions } from "@/lib/data";
import { GAMES, PHASE_POINTS } from "@/lib/games-data";

export interface PostGameCriterion {
  label: string;
  pts: number;
  count: number;
  total: number;
  names: string[];
}

export interface PostGamePredGroup {
  prediction: string;
  names: string[];
  correct: boolean;
}

export interface PostGameStatsData {
  gameId: number;
  totalParticipants: number;
  totalWithPrediction: number;
  criteria: PostGameCriterion[];
  predGroups: PostGamePredGroup[];
}

export async function GET(req: Request) {
  const idsParam = new URL(req.url).searchParams.get("gameIds") ?? "";
  const gameIds  = idsParam.split(",").map(Number).filter(Boolean);
  if (gameIds.length === 0) return Response.json({});

  const [participants, results] = await Promise.all([
    getParticipants(),
    getResults(),
  ]);

  const allPreds = await Promise.all(
    participants.map(async (p) => ({
      name: p.name,
      preds: await getPredictions(p.id),
    }))
  );

  const out: Record<number, PostGameStatsData> = {};

  for (const gameId of gameIds) {
    const game = GAMES.find((g) => g.id === gameId);
    if (!game) continue;

    if (game.phase === "grupos") {
      const r = results.groups[gameId];
      if (!r) continue;

      const rA = r.scoreA;
      const rB = r.scoreB;
      const actualOutcome = rA > rB ? "H" : rA < rB ? "A" : "D";
      const actualDiff    = rA - rB;

      const resultNames:   string[] = [];
      const golsANames:    string[] = [];
      const golsBNames:    string[] = [];
      const difExataNames: string[] = [];
      const difAbsNames:   string[] = [];
      const predMap = new Map<string, { names: string[]; correct: boolean }>();

      for (const { name, preds } of allPreds) {
        const pred = preds.groups[gameId];
        if (!pred || pred.scoreA === null || pred.scoreB === null) continue;
        const pA = pred.scoreA!;
        const pB = pred.scoreB!;
        const key = `${pA}–${pB}`;

        if (!predMap.has(key)) predMap.set(key, { names: [], correct: pA === rA && pB === rB });
        predMap.get(key)!.names.push(name);

        const predOutcome = pA > pB ? "H" : pA < pB ? "A" : "D";
        if (predOutcome === actualOutcome)               resultNames.push(name);
        if (pA === rA)                                   golsANames.push(name);
        if (pB === rB)                                   golsBNames.push(name);
        if (pA - pB === actualDiff)                      difExataNames.push(name);
        if (Math.abs(pA - pB) === Math.abs(actualDiff)) difAbsNames.push(name);
      }

      const predGroups: PostGamePredGroup[] = Array.from(predMap.entries())
        .map(([prediction, { names, correct }]) => ({ prediction, names, correct }))
        .sort((a, b) => b.names.length - a.names.length);

      const totalWithPrediction = predGroups.reduce((s, g) => s + g.names.length, 0);

      out[gameId] = {
        gameId,
        totalParticipants: participants.length,
        totalWithPrediction,
        criteria: [
          { label: "Resultado correto (V/E/D)", pts: 3,  count: resultNames.length,   total: totalWithPrediction, names: resultNames   },
          { label: `Gols ${game.teamA} correto`, pts: 1, count: golsANames.length,     total: totalWithPrediction, names: golsANames     },
          { label: `Gols ${game.teamB} correto`, pts: 1, count: golsBNames.length,     total: totalWithPrediction, names: golsBNames     },
          { label: "Diferença de gols exata",    pts: 2, count: difExataNames.length,  total: totalWithPrediction, names: difExataNames  },
          { label: "Diferença absoluta",         pts: 1, count: difAbsNames.length,    total: totalWithPrediction, names: difAbsNames    },
        ],
        predGroups,
      };

    } else {
      const r = results.knockout[gameId];
      const teams = results.knockoutTeams?.[gameId];

      // Fase32 stat can be shown as soon as the bracket is set, even before the game result
      const isFase32 = game.phase === "fase32";
      if (!r && (!isFase32 || !teams)) continue;

      const correctNames: string[] = [];
      const predMap = new Map<string, string[]>();

      for (const { name, preds } of allPreds) {
        const pred = preds.knockout[gameId];
        if (!pred?.winner) continue;
        if (!predMap.has(pred.winner)) predMap.set(pred.winner, []);
        predMap.get(pred.winner)!.push(name);
        // For fase32: correct = predicted team is in the game (regardless of winner)
        const correct = isFase32
          ? (teams != null && (pred.winner === teams.teamA || pred.winner === teams.teamB))
          : pred.winner === r?.winner;
        if (correct) correctNames.push(name);
      }

      const isCorrectPred = isFase32
        ? (pred: string) => teams != null && (pred === teams.teamA || pred === teams.teamB)
        : (pred: string) => pred === r?.winner;

      const predGroups: PostGamePredGroup[] = Array.from(predMap.entries())
        .map(([prediction, names]) => ({ prediction, names, correct: isCorrectPred(prediction) }))
        .sort((a, b) => b.names.length - a.names.length);

      const totalWithPrediction = predGroups.reduce((s, g) => s + g.names.length, 0);
      const pts = PHASE_POINTS[game.phase];
      const label = isFase32 ? "Time classificado (Fase de 32)" : "Time correto na fase";

      out[gameId] = {
        gameId,
        totalParticipants: participants.length,
        totalWithPrediction,
        criteria: [
          { label, pts, count: correctNames.length, total: totalWithPrediction, names: correctNames },
        ],
        predGroups,
      };
    }
  }

  return Response.json(out, {
    headers: { "Cache-Control": "public, max-age=120" },
  });
}
