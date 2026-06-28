import { GAMES, GROUPS, FASE32_GROUPS } from "./games-data";
import { ANNEX_C } from "./annex-c";

const GROUP_GAMES = GAMES.filter((g) => g.phase === "grupos");

interface Standing {
  team: string;
  J: number;
  Pts: number;
  SG: number;
  GP: number;
  GC: number;
}

function calcGroupStandings(
  group: string,
  groupResults: Record<number, { scoreA: number; scoreB: number }>
): Standing[] {
  const teams = GROUPS[group] ?? [];
  const games = GROUP_GAMES.filter((g) => g.group === group);
  const s: Record<string, Standing> = Object.fromEntries(
    teams.map((t) => [t, { team: t, J: 0, Pts: 0, GP: 0, GC: 0, SG: 0 }])
  );
  for (const game of games) {
    const r = groupResults[game.id];
    if (!r) continue;
    const a = s[game.teamA];
    const b = s[game.teamB];
    if (!a || !b) continue;
    a.J++; b.J++;
    a.GP += r.scoreA; a.GC += r.scoreB;
    b.GP += r.scoreB; b.GC += r.scoreA;
    if (r.scoreA > r.scoreB)      { a.Pts += 3; }
    else if (r.scoreB > r.scoreA) { b.Pts += 3; }
    else                           { a.Pts++; b.Pts++; }
  }
  return teams
    .map((t) => ({ ...s[t], SG: s[t].GP - s[t].GC }))
    .sort((a, b) => b.Pts - a.Pts || b.SG - a.SG || b.GP - a.GP);
}

export function computeFase32Bracket(
  groupResults: Record<number, { scoreA: number; scoreB: number }>
): Record<number, { teamA: string; teamB: string }> {
  const allStandings: Record<string, Standing[]> = {};
  for (const grp of Object.keys(GROUPS)) {
    allStandings[grp] = calcGroupStandings(grp, groupResults);
  }

  // 8 best third-place finishers ranked by Pts → SG → GP
  const thirdQ = Object.keys(GROUPS)
    .flatMap((grp) => {
      const t = allStandings[grp][2];
      return t && t.J > 0
        ? [{ team: t.team, group: grp, Pts: t.Pts, SG: t.SG, GP: t.GP }]
        : [];
    })
    .sort((a, b) => b.Pts - a.Pts || b.SG - a.SG || b.GP - a.GP)
    .slice(0, 8);

  const qualifyingKey = thirdQ.map((q) => q.group).sort().join("");
  const annexEntry = ANNEX_C[qualifyingKey] ?? {};

  function resolve(code: string, otherCode: string): string {
    if (code === "3rd") {
      if (thirdQ.length < 8) return "TBD";
      // otherCode[1] is the group letter of the winner this 3rd-place team will face
      const thirdGroup = annexEntry[otherCode[1]];
      return thirdQ.find((q) => q.group === thirdGroup)?.team ?? "TBD";
    }
    const pos = Number(code[0]) - 1;
    const grp = code[1];
    return allStandings[grp]?.[pos]?.team ?? "TBD";
  }

  const bracket: Record<number, { teamA: string; teamB: string }> = {};
  for (const [gameIdStr, codes] of Object.entries(FASE32_GROUPS)) {
    const gameId = Number(gameIdStr);
    bracket[gameId] = {
      teamA: resolve(codes[0], codes[1]),
      teamB: resolve(codes[1], codes[0]),
    };
  }
  return bracket;
}
