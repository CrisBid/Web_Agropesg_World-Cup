import type { Phase } from "./games-data";
import { PHASE_POINTS } from "./games-data";

export interface GroupPrediction {
  scoreA: number | null;
  scoreB: number | null;
}

export interface KnockoutPrediction {
  winner: string | null;
  scoreA?: number | null;
  scoreB?: number | null;
}

export interface ParticipantPredictions {
  groups: Record<number, GroupPrediction>; // gameId → prediction
  knockout: Record<number, KnockoutPrediction>; // gameId → prediction
  champion: string | null;
  thirdPlace: string | null;
}

export interface ActualResults {
  groups: Record<number, { scoreA: number; scoreB: number }>; // gameId → result
  knockout: Record<number, { winner: string; scoreA?: number; scoreB?: number }>; // gameId → result
  knockoutTeams?: Record<number, { teamA: string; teamB: string }>; // admin-defined teams for each knockout game
  champion: string | null;
  thirdPlace: string | null;
}

export interface GamePoints {
  gameId: number;
  points: number;
  breakdown: string[];
}

export function calcGroupGamePoints(
  prediction: GroupPrediction,
  result: { scoreA: number; scoreB: number }
): { points: number; breakdown: string[] } {
  const { scoreA: pA, scoreB: pB } = prediction;
  const { scoreA: rA, scoreB: rB } = result;

  if (pA === null || pB === null) return { points: 0, breakdown: [] };

  let points = 0;
  const breakdown: string[] = [];

  // Correct result (win/draw/loss)
  const predictedResult = pA > pB ? "H" : pA < pB ? "A" : "D";
  const actualResult = rA > rB ? "H" : rA < rB ? "A" : "D";
  if (predictedResult === actualResult) {
    points += 3;
    breakdown.push("Resultado correto (+3)");
  }

  // Correct goals Team A
  if (pA === rA) {
    points += 1;
    breakdown.push("Gols do time A correto (+1)");
  }

  // Correct goals Team B
  if (pB === rB) {
    points += 1;
    breakdown.push("Gols do time B correto (+1)");
  }

  const predictedDiff = pA - pB;
  const actualDiff = rA - rB;

  // Correct signed goal difference: 2 pts
  if (predictedDiff === actualDiff) {
    points += 2;
    breakdown.push("Diferença de gols exata (+2)");
  }

  // Correct absolute difference: 1 pt (awarded whether exact or inverted)
  if (Math.abs(predictedDiff) === Math.abs(actualDiff)) {
    points += 1;
    breakdown.push("Diferença de gols absoluta (+1)");
  }

  return { points, breakdown };
}

export function calcKnockoutGamePoints(
  prediction: KnockoutPrediction,
  result: { winner: string },
  phase: Phase
): { points: number; breakdown: string[] } {
  if (!prediction.winner || !result.winner) return { points: 0, breakdown: [] };

  const phasePoints = PHASE_POINTS[phase];
  if (prediction.winner === result.winner) {
    return {
      points: phasePoints,
      breakdown: [`Time correto na ${phase} (+${phasePoints})`],
    };
  }
  return { points: 0, breakdown: [] };
}

export function calcTotalPoints(
  predictions: ParticipantPredictions,
  results: ActualResults,
  gamesPhaseMap: Record<number, Phase>
): { total: number; games: GamePoints[]; bonuses: { champion: number; thirdPlace: number } } {
  let total = 0;
  const games: GamePoints[] = [];

  // Group stage
  for (const [gameIdStr, pred] of Object.entries(predictions.groups)) {
    const gameId = Number(gameIdStr);
    const result = results.groups[gameId];
    if (!result) continue;

    const { points, breakdown } = calcGroupGamePoints(pred, result);
    total += points;
    games.push({ gameId, points, breakdown });
  }

  // Knockout
  for (const [gameIdStr, pred] of Object.entries(predictions.knockout)) {
    const gameId = Number(gameIdStr);
    const phase = gamesPhaseMap[gameId];

    // Fase de 32:
    // +3 pts if the predicted team qualified to fase32 (appears in ANY fase32 game).
    // +4 pts additionally if that team also wins THIS specific game (advances to oitavas).
    if (phase === "fase32") {
      if (!pred.winner) continue;

      const allFase32Teams = new Set(
        Object.values(results.knockoutTeams ?? {}).flatMap((t) => [t.teamA, t.teamB]).filter((t) => t && t !== "TBD")
      );

      let gamePts = 0;
      const breakdown: string[] = [];

      if (allFase32Teams.has(pred.winner)) {
        gamePts += 3;
        breakdown.push("Time classificado para a Fase de 32 (+3)");
      }

      const teamsInGame = results.knockoutTeams?.[gameId];
      const knockoutResult = results.knockout[gameId];
      if (
        teamsInGame &&
        (pred.winner === teamsInGame.teamA || pred.winner === teamsInGame.teamB) &&
        knockoutResult &&
        pred.winner === knockoutResult.winner
      ) {
        gamePts += PHASE_POINTS.oitavas;
        breakdown.push(`Time que avançou da Fase de 32 (+${PHASE_POINTS.oitavas})`);
      }

      if (gamePts > 0) {
        total += gamePts;
        games.push({ gameId, points: gamePts, breakdown });
      }
      continue;
    }

    const result = results.knockout[gameId];
    if (!result) continue;
    const { points, breakdown } = calcKnockoutGamePoints(pred, result, phase);
    total += points;
    games.push({ gameId, points, breakdown });
  }

  // Bonuses
  let champion = 0;
  let thirdPlace = 0;

  if (predictions.champion && results.champion && predictions.champion === results.champion) {
    champion = 15;
    total += 15;
  }

  if (predictions.thirdPlace && results.thirdPlace && predictions.thirdPlace === results.thirdPlace) {
    thirdPlace = 10;
    total += 10;
  }

  return { total, games, bonuses: { champion, thirdPlace } };
}
