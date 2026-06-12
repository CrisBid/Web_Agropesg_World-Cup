/**
 * api-football.com client — used exclusively for live scores.
 * Free plan does not support 2026 historical fixtures, but /fixtures/live works.
 *
 * Dynamic budget model (100 req/day limit):
 *   available  = 100 − SAFETY_MARGIN (8)  = 92 req/day
 *   reqPerGame = floor(92 / gamesScheduledToday)  [8–45 range]
 *   liveTTL    = GAME_DURATION × 0.65 / liveReq  (65% of budget → live score)
 *   statsTTL   = GAME_DURATION × 0.35 / statsReq (35% of budget → stats)
 *
 *   Example: 6 games today → reqPerGame=15 → live every ~11 min, stats every ~20 min
 *   Example: 1 game  today → reqPerGame=45 → live every ~3.5 min, stats every ~6 min
 */

import { GAMES } from "./games-data";
import { getResults } from "./data";

const BASE = "https://v3.football.api-sports.io";
const LEAGUE_ID = 1; // FIFA World Cup

const DAILY_BUDGET   = 100;
const SAFETY_MARGIN  = 8;          // always keep this many requests in reserve
const GAME_DURATION  = 105 * 60_000; // 90 min + 15 min stoppage buffer
const WINDOW_BEFORE  = 20  * 60_000; // start polling 20 min before kickoff
const WINDOW_AFTER   = 140 * 60_000; // stop polling 140 min after kickoff

// ─── Budget calculation ────────────────────────────────────────────────────

export interface BudgetInfo {
  todayGames: number;
  reqPerGame: number;
  liveTTL: number;   // ms — server cache TTL for live endpoint
  statsTTL: number;  // ms — server cache TTL per fixture stats
  /** Recommended client poll interval (ms). Always ≥ 30 s. */
  clientPollMs: number;
}

function countTodayGames(): number {
  // g.date is "YYYY-MM-DDTHH:MM" in BRT (UTC-3). Shift now to BRT for date comparison.
  const nowBRT = new Date(Date.now() - 3 * 3_600_000);
  const todayStr = nowBRT.toISOString().slice(0, 10); // "2026-06-12"
  return GAMES.filter((g) => g.date.startsWith(todayStr)).length;
}

export function computeBudget(): BudgetInfo {
  const todayGames = Math.max(1, countTodayGames());
  const available  = DAILY_BUDGET - SAFETY_MARGIN; // 92
  const reqPerGame = Math.min(45, Math.max(8, Math.floor(available / todayGames)));

  // Allocate: 65% live, 35% stats
  const liveReq  = Math.max(4, Math.floor(reqPerGame * 0.65));
  const statsReq = Math.max(3, reqPerGame - liveReq);

  const liveTTL  = Math.floor(GAME_DURATION / liveReq);
  const statsTTL = Math.floor(GAME_DURATION / statsReq);

  // Client should poll at most as often as the server refreshes (no faster than 30 s)
  const clientPollMs = Math.max(30_000, liveTTL);

  return { todayGames, reqPerGame, liveTTL, statsTTL, clientPollMs };
}

// ─── Team name mapping (api-football.com English → Portuguese) ─────────────
export const TEAM_MAP: Record<string, string> = {
  "Mexico": "México",
  "South Africa": "África do Sul",
  "South Korea": "Coreia do Sul",
  "Czechia": "República Tcheca",
  "Czech Republic": "República Tcheca",
  "Canada": "Canadá",
  "Bosnia-Herzegovina": "Bósnia e Herzegovina",
  "Bosnia and Herzegovina": "Bósnia e Herzegovina",
  "Bosnia & Herzegovina": "Bósnia e Herzegovina",
  "United States": "Estados Unidos",
  "USA": "Estados Unidos",
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
  "Côte d'Ivoire": "Costa do Marfim",
  "Cote d'Ivoire": "Costa do Marfim",
  "Ecuador": "Equador",
  "Sweden": "Suécia",
  "Tunisia": "Tunísia",
  "Spain": "Espanha",
  "Cape Verde Islands": "Cabo Verde",
  "Cape Verde": "Cabo Verde",
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
  "DR Congo": "RD Congo",
  "Congo": "RD Congo",
  "Uzbekistan": "Uzbequistão",
  "England": "Inglaterra",
  "Croatia": "Croácia",
  "Ghana": "Gana",
  "Panama": "Panamá",
  "Colombia": "Colômbia",
};

function toPortuguese(name: string): string {
  return TEAM_MAP[name] ?? name;
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface LiveGoalEvent {
  elapsed: number;
  extraTime?: number | null;
  teamPortuguese: string;
  player: string;
  type: "Gol" | "Gol Contra" | "Pênalti";
}

export interface LiveStats {
  possession: { home: number; away: number };
  totalShots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  yellowCards: { home: number; away: number };
  redCards: { home: number; away: number };
  saves: { home: number; away: number };
}

export interface LiveMatch {
  fixtureId: number;
  homeTeam: string;        // Portuguese
  awayTeam: string;        // Portuguese
  homeGoals: number;
  awayGoals: number;
  elapsed: number | null;
  status: string;          // "1H", "2H", "HT", "ET", "P", "FT"
  statusLabel: string;     // "1º Tempo", "Intervalo", etc.
  gameId: number | null;   // our local game ID
  events: LiveGoalEvent[];
  stats: LiveStats | null;
}

// ─── Status label mapping ──────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  "1H": "1º Tempo",
  "2H": "2º Tempo",
  "HT": "Intervalo",
  "ET": "Prorrogação",
  "BT": "Pausa",
  "P":  "Pênaltis",
  "FT": "Encerrado",
  "SUSP": "Suspenso",
  "INT": "Interrompido",
  "LIVE": "Ao Vivo",
};

// ─── In-memory server-side caches ─────────────────────────────────────────

let liveCache: { matches: LiveMatch[]; fetchedAt: number } | null = null;
const statsCache = new Map<number, { stats: LiveStats; fetchedAt: number }>();

// ─── Schedule check ────────────────────────────────────────────────────────

export function isAnyGameExpectedLive(): boolean {
  const now = Date.now();
  return GAMES.some((g) => {
    // Dates in games-data.ts are BRT (UTC-3)
    const kickoff = new Date(g.date + ":00-03:00").getTime();
    return now >= kickoff - WINDOW_BEFORE && now <= kickoff + WINDOW_AFTER;
  });
}

// ─── Game ID lookup ────────────────────────────────────────────────────────
// Matches a live fixture (by team names) to our local game ID.
// Also checks admin-set knockoutTeams passed in from the caller.
function findGameId(
  homePt: string,
  awayPt: string,
  knockoutTeams?: Record<number, { teamA: string; teamB: string }>
): number | null {
  for (const g of GAMES) {
    if (g.teamA === homePt && g.teamB === awayPt) return g.id;
  }
  if (knockoutTeams) {
    for (const [idStr, teams] of Object.entries(knockoutTeams)) {
      if (teams.teamA === homePt && teams.teamB === awayPt) return Number(idStr);
    }
  }
  return null;
}

// ─── Stats parsing ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseStat(teamStats: any[], name: string): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entry = teamStats.find((s: any) => s.type === name);
  if (!entry?.value) return 0;
  const v = String(entry.value).replace("%", "").trim();
  return Number(v) || 0;
}

// ─── API fetch helpers ─────────────────────────────────────────────────────

async function apiFetch(path: string): Promise<unknown> {
  const token = process.env.APIFOOTBALL_TOKEN;
  if (!token) throw new Error("APIFOOTBALL_TOKEN não configurado");

  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": token },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`api-football ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Live matches ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFixture(f: any, knockoutTeams?: Record<number, { teamA: string; teamB: string }>): LiveMatch {
  const homeRaw: string = f.teams?.home?.name ?? "";
  const awayRaw: string = f.teams?.away?.name ?? "";
  const homePt = toPortuguese(homeRaw);
  const awayPt = toPortuguese(awayRaw);
  const statusShort: string = f.fixture?.status?.short ?? "NS";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: LiveGoalEvent[] = (f.events ?? []).filter((e: any) => e.type === "Goal").map((e: any) => ({
    elapsed: e.time?.elapsed ?? 0,
    extraTime: e.time?.extra ?? null,
    teamPortuguese: toPortuguese(e.team?.name ?? ""),
    player: e.player?.name ?? "Desconhecido",
    type: e.detail === "Own Goal" ? "Gol Contra"
        : e.detail === "Penalty" ? "Pênalti"
        : "Gol",
  }));

  return {
    fixtureId: f.fixture?.id ?? 0,
    homeTeam: homePt,
    awayTeam: awayPt,
    homeGoals: f.goals?.home ?? 0,
    awayGoals: f.goals?.away ?? 0,
    elapsed: f.fixture?.status?.elapsed ?? null,
    status: statusShort,
    statusLabel: STATUS_LABELS[statusShort] ?? statusShort,
    gameId: findGameId(homePt, awayPt, knockoutTeams),
    events,
    stats: null,
  };
}

export async function getLiveMatches(): Promise<LiveMatch[]> {
  const now = Date.now();

  const { liveTTL } = computeBudget();
  if (liveCache && now - liveCache.fetchedAt < liveTTL) {
    return liveCache.matches;
  }

  // Don't burn a request if no game should be live right now
  if (!isAnyGameExpectedLive()) {
    return liveCache?.matches ?? [];
  }

  try {
    const [data, results] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiFetch(`/fixtures?live=all`) as Promise<any>,
      getResults(),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiData = data as any;
    if (apiData.errors && Object.keys(apiData.errors).length > 0) {
      console.error("[live] API error:", apiData.errors);
      return liveCache?.matches ?? [];
    }

    const knockoutTeams = results.knockoutTeams;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matches: LiveMatch[] = (apiData.response ?? [])
      .filter((f: any) => f.league?.id === LEAGUE_ID)
      .map((f: any) => mapFixture(f, knockoutTeams));

    liveCache = { matches, fetchedAt: now };
    return matches;
  } catch (err) {
    console.error("[live] fetch error:", err);
    return liveCache?.matches ?? [];
  }
}

// ─── Match statistics ──────────────────────────────────────────────────────

export async function getMatchStats(fixtureId: number): Promise<LiveStats | null> {
  const now = Date.now();
  const { statsTTL } = computeBudget();
  const cached = statsCache.get(fixtureId);
  if (cached && now - cached.fetchedAt < statsTTL) return cached.stats;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await apiFetch(`/fixtures/statistics?fixture=${fixtureId}`) as any;
    const raw = data.response ?? [];
    if (raw.length < 2) return null;

    const h = raw[0].statistics;
    const a = raw[1].statistics;

    const stats: LiveStats = {
      possession:     { home: parseStat(h, "Ball Possession"),  away: parseStat(a, "Ball Possession")  },
      totalShots:     { home: parseStat(h, "Total Shots"),      away: parseStat(a, "Total Shots")      },
      shotsOnTarget:  { home: parseStat(h, "Shots on Goal"),    away: parseStat(a, "Shots on Goal")    },
      corners:        { home: parseStat(h, "Corner Kicks"),     away: parseStat(a, "Corner Kicks")     },
      fouls:          { home: parseStat(h, "Fouls"),            away: parseStat(a, "Fouls")            },
      yellowCards:    { home: parseStat(h, "Yellow Cards"),     away: parseStat(a, "Yellow Cards")     },
      redCards:       { home: parseStat(h, "Red Cards"),        away: parseStat(a, "Red Cards")        },
      saves:          { home: parseStat(h, "Goalkeeper Saves"), away: parseStat(a, "Goalkeeper Saves") },
    };

    statsCache.set(fixtureId, { stats, fetchedAt: now });
    return stats;
  } catch {
    return null;
  }
}

// ─── Combined live data with stats ────────────────────────────────────────

export async function getLiveMatchesWithStats(): Promise<LiveMatch[]> {
  const matches = await getLiveMatches();
  if (matches.length === 0) return [];

  // Fetch stats in parallel for all live games (each cached independently)
  const withStats = await Promise.all(
    matches.map(async (m) => {
      const stats = await getMatchStats(m.fixtureId);
      return { ...m, stats };
    })
  );

  return withStats;
}
