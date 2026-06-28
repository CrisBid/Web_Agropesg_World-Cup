import type { Phase } from "./games-data";
import { GAMES, GROUPS, PHASE_POINTS } from "./games-data";

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

const GROUP_GAMES = GAMES.filter((g) => g.phase === "grupos");

// Returns the 32 teams this user predicted would qualify to fase32,
// derived purely from their group-stage score predictions.
export function getPredictedFase32Qualifiers(
  groupPredictions: Record<number, { scoreA: number | null; scoreB: number | null }>
): string[] {
  const qualifiers: string[] = [];
  const thirds: { team: string; Pts: number; SG: number; GP: number }[] = [];

  for (const grp of Object.keys(GROUPS)) {
    const teams = GROUPS[grp] ?? [];
    const games = GROUP_GAMES.filter((g) => g.group === grp);
    const s: Record<string, { Pts: number; GP: number; GC: number; J: number }> = Object.fromEntries(
      teams.map((t) => [t, { Pts: 0, GP: 0, GC: 0, J: 0 }])
    );

    for (const game of games) {
      const r = groupPredictions[game.id];
      if (!r || r.scoreA === null || r.scoreB === null) continue;
      const a = s[game.teamA];
      const b = s[game.teamB];
      if (!a || !b) continue;
      a.J++; b.J++;
      a.GP += r.scoreA!; a.GC += r.scoreB!;
      b.GP += r.scoreB!; b.GC += r.scoreA!;
      if (r.scoreA > r.scoreB)      { a.Pts += 3; }
      else if (r.scoreB > r.scoreA) { b.Pts += 3; }
      else                           { a.Pts++; b.Pts++; }
    }

    const sorted = teams
      .filter((t) => s[t].J > 0)
      .map((t) => ({ team: t, Pts: s[t].Pts, SG: s[t].GP - s[t].GC, GP: s[t].GP }))
      .sort((a, b) => b.Pts - a.Pts || b.SG - a.SG || b.GP - a.GP);

    if (sorted[0]) qualifiers.push(sorted[0].team);
    if (sorted[1]) qualifiers.push(sorted[1].team);
    if (sorted[2]) thirds.push(sorted[2]);
  }

  thirds.sort((a, b) => b.Pts - a.Pts || b.SG - a.SG || b.GP - a.GP);
  for (const t of thirds.slice(0, 8)) qualifiers.push(t.team);

  return qualifiers;
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

  // Fase32 classifying: +3 pts per team the user predicted would qualify,
  // derived from GROUP predictions (not from fase32 game picks).
  const allFase32Teams = new Set(
    Object.values(results.knockoutTeams ?? {}).flatMap((t) => [t.teamA, t.teamB]).filter((t) => t && t !== "TBD")
  );
  if (allFase32Teams.size > 0) {
    for (const team of getPredictedFase32Qualifiers(predictions.groups)) {
      if (allFase32Teams.has(team)) total += 3;
    }
  }

  // Knockout (fase32: only advancing criterion; other phases: winner criterion)
  for (const [gameIdStr, pred] of Object.entries(predictions.knockout)) {
    const gameId = Number(gameIdStr);
    const phase = gamesPhaseMap[gameId];

    if (phase === "fase32") {
      // +4 pts if the predicted team is in this game AND wins it (advances to oitavas)
      if (!pred.winner) continue;
      const teamsInGame = results.knockoutTeams?.[gameId];
      const knockoutResult = results.knockout[gameId];
      if (
        teamsInGame &&
        (pred.winner === teamsInGame.teamA || pred.winner === teamsInGame.teamB) &&
        knockoutResult &&
        pred.winner === knockoutResult.winner
      ) {
        total += PHASE_POINTS.oitavas;
        games.push({ gameId, points: PHASE_POINTS.oitavas, breakdown: [`Time que avançou da Fase de 32 (+${PHASE_POINTS.oitavas})`] });
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
