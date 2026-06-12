import { GAMES } from "./games-data";
import { getResults, saveResults } from "./data";

// Mapping from football-data.org English team names → our Portuguese names
const NAME_MAP: Record<string, string> = {
  "Mexico": "México",
  "South Africa": "África do Sul",
  "South Korea": "Coreia do Sul",
  "Czechia": "República Tcheca",
  "Canada": "Canadá",
  "Bosnia-Herzegovina": "Bósnia e Herzegovina",
  "United States": "Estados Unidos",
  "Paraguay": "Paraguai",
  "Qatar": "Catar",
  "Switzerland": "Suíça",
  "Brazil": "Brasil",
  "Morocco": "Marrocos",
  "Haiti": "Haiti",
  "Scotland": "Escócia",
  "Australia": "Austrália",
  "Turkey": "Turquia",
  "Germany": "Alemanha",
  "Curaçao": "Curaçao",
  "Netherlands": "Holanda",
  "Japan": "Japão",
  "Ivory Coast": "Costa do Marfim",
  "Ecuador": "Equador",
  "Sweden": "Suécia",
  "Tunisia": "Tunísia",
  "Spain": "Espanha",
  "Cape Verde Islands": "Cabo Verde",
  "Belgium": "Bélgica",
  "Egypt": "Egito",
  "Saudi Arabia": "Arábia Saudita",
  "Uruguay": "Uruguai",
  "Iran": "Irã",
  "New Zealand": "Nova Zelândia",
  "France": "França",
  "Senegal": "Senegal",
  "Iraq": "Iraque",
  "Norway": "Noruega",
  "Argentina": "Argentina",
  "Algeria": "Argélia",
  "Austria": "Áustria",
  "Jordan": "Jordânia",
  "Portugal": "Portugal",
  "Congo DR": "RD Congo",
  "Uzbekistan": "Uzbequistão",
  "England": "Inglaterra",
  "Croatia": "Croácia",
  "Ghana": "Gana",
  "Panama": "Panamá",
  "Colombia": "Colômbia",
};

interface ApiTeam {
  id: number;
  name: string;
}

interface ApiScore {
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

interface ApiMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: ApiScore;
}

// API stage → our phase name
const STAGE_TO_PHASE: Record<string, string> = {
  LAST_32: "fase32",
  LAST_16: "oitavas",
  QUARTER_FINALS: "quartas",
  SEMI_FINALS: "semis",
  THIRD_PLACE: "terceiro",
  FINAL: "final",
};

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
  lastSync: string;
}

export async function syncResultsFromAPI(): Promise<SyncResult> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("FOOTBALL_DATA_TOKEN não configurado");

  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
    {
      headers: { "X-Auth-Token": token },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro na API football-data.org: ${res.status} — ${text}`);
  }

  const data = await res.json();
  const matches: ApiMatch[] = data.matches ?? [];

  // Group matches by stage, sorted chronologically
  const byStage = new Map<string, ApiMatch[]>();
  for (const m of matches) {
    const list = byStage.get(m.stage) ?? [];
    list.push(m);
    byStage.set(m.stage, list);
  }
  for (const list of byStage.values()) {
    list.sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  }

  // Build group-stage lookup: "homePortuguese|awayPortuguese" → gameId
  const groupLookup = new Map<string, number>();
  for (const g of GAMES) {
    if (g.phase === "grupos") groupLookup.set(`${g.teamA}|${g.teamB}`, g.id);
  }

  // Build knockout order: our game IDs sorted by date, per phase
  const sortByDate = (a: { date: string }, b: { date: string }) =>
    new Date(a.date).getTime() - new Date(b.date).getTime();

  const knockoutOrder: Record<string, number[]> = {
    LAST_32: GAMES.filter((g) => g.phase === "fase32").sort(sortByDate).map((g) => g.id),
    LAST_16: GAMES.filter((g) => g.phase === "oitavas").sort(sortByDate).map((g) => g.id),
    QUARTER_FINALS: GAMES.filter((g) => g.phase === "quartas").sort(sortByDate).map((g) => g.id),
    SEMI_FINALS: GAMES.filter((g) => g.phase === "semis").sort(sortByDate).map((g) => g.id),
    THIRD_PLACE: [103],
    FINAL: [104],
  };

  const results = await getResults();
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [stage, apiMatches] of byStage.entries()) {
    for (let i = 0; i < apiMatches.length; i++) {
      const m = apiMatches[i];

      // Only process finished games with actual scores
      if (m.status !== "FINISHED") { skipped++; continue; }
      if (m.score.fullTime.home === null || m.score.fullTime.away === null) { skipped++; continue; }

      const scoreA = m.score.fullTime.home;
      const scoreB = m.score.fullTime.away;

      if (stage === "GROUP_STAGE") {
        const homeP = NAME_MAP[m.homeTeam.name];
        const awayP = NAME_MAP[m.awayTeam.name];
        if (!homeP) { errors.push(`Seleção desconhecida: "${m.homeTeam.name}"`); continue; }
        if (!awayP) { errors.push(`Seleção desconhecida: "${m.awayTeam.name}"`); continue; }

        const gameId = groupLookup.get(`${homeP}|${awayP}`);
        if (!gameId) { errors.push(`Jogo não encontrado: ${homeP} × ${awayP}`); continue; }

        results.groups[gameId] = { scoreA, scoreB };
        synced++;
      } else if (STAGE_TO_PHASE[stage]) {
        const ourIds = knockoutOrder[stage];
        if (!ourIds || i >= ourIds.length) {
          errors.push(`Índice fora dos limites para ${stage}[${i}]`);
          continue;
        }
        const gameId = ourIds[i];

        // Derive winner: fullTime winner or penalty winner
        let winner: string | undefined;
        const winnerSide = m.score.winner;
        if (winnerSide === "HOME_TEAM") {
          winner = NAME_MAP[m.homeTeam.name] ?? m.homeTeam.name;
        } else if (winnerSide === "AWAY_TEAM") {
          winner = NAME_MAP[m.awayTeam.name] ?? m.awayTeam.name;
        }

        // Only record knockout result when winner is known
        if (!winner) { skipped++; continue; }
        results.knockout[gameId] = { scoreA, scoreB, winner };
        synced++;

        if (stage === "FINAL" && winner) results.champion = winner;
        if (stage === "THIRD_PLACE" && winner) results.thirdPlace = winner;
      }
    }
  }

  await saveResults(results);

  return { synced, skipped, errors, lastSync: new Date().toISOString() };
}
