import { prisma } from "./prisma";
import { GAMES } from "./games-data";
import type { Game } from "./games-data";
import type { ParticipantPredictions, ActualResults } from "./scoring";
import { getDerivedClassificationSlots } from "./scoring";

// ─── Participants ───────────────────────────────────────────────────────────

export interface Participant {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  lockedAt?: string | null;
  isAdmin?: boolean;
}

function toParticipant(p: {
  id: string;
  name: string;
  phone: string;
  createdAt: Date;
  lockedAt: Date | null;
  isAdmin: boolean;
}): Participant {
  return {
    id: p.id,
    name: p.name,
    phone: p.phone,
    createdAt: p.createdAt.toISOString(),
    lockedAt: p.lockedAt ? p.lockedAt.toISOString() : null,
    isAdmin: p.isAdmin,
  };
}

export async function getParticipants(): Promise<Participant[]> {
  const rows = await prisma.participant.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toParticipant);
}

export async function addParticipant(name: string, phone: string): Promise<Participant> {
  const id = Date.now().toString();
  const row = await prisma.participant.create({
    data: { id, name: name.trim(), phone: phone.replace(/\D/g, "") },
  });
  return toParticipant(row);
}

export async function findByPhone(phone: string): Promise<Participant | undefined> {
  const digits = phone.replace(/\D/g, "");
  const row = await prisma.participant.findUnique({ where: { phone: digits } });
  return row ? toParticipant(row) : undefined;
}

export async function setParticipantLocked(id: string, locked: boolean): Promise<void> {
  await prisma.participant.update({
    where: { id },
    data: { lockedAt: locked ? new Date() : null },
  });
}

export async function setParticipantAdmin(id: string, isAdmin: boolean): Promise<void> {
  await prisma.participant.update({ where: { id }, data: { isAdmin } });
}

export async function removeParticipant(id: string): Promise<void> {
  await prisma.participant.delete({ where: { id } });
}

// ─── Predictions ────────────────────────────────────────────────────────────

export async function getPredictions(participantId: string): Promise<ParticipantPredictions> {
  const [participant, groupRows, knockoutRows, classificationRows] = await Promise.all([
    prisma.participant.findUnique({ where: { id: participantId } }),
    prisma.groupPrediction.findMany({ where: { participantId } }),
    prisma.knockoutPrediction.findMany({ where: { participantId } }),
    prisma.classificationOverride.findMany({ where: { participantId } }),
  ]);

  const groups: ParticipantPredictions["groups"] = {};
  for (const r of groupRows) {
    groups[r.gameId] = { scoreA: r.scoreA, scoreB: r.scoreB };
  }

  const knockout: ParticipantPredictions["knockout"] = {};
  for (const r of knockoutRows) {
    knockout[r.gameId] = { winner: r.winner, scoreA: r.scoreA, scoreB: r.scoreB };
  }

  // Merge: derived slots are the baseline, explicit DB overrides take precedence per slot.
  // This ensures that saving one slot doesn't wipe out the other 31 derived teams.
  const mergedClassificationOverride = classificationRows.length > 0
    ? { ...getDerivedClassificationSlots(groups), ...Object.fromEntries(classificationRows.map((r) => [r.slot, r.team])) }
    : undefined;

  return {
    groups,
    knockout,
    champion: participant?.predictedChampion ?? null,
    thirdPlace: participant?.predictedThirdPlace ?? null,
    ...(mergedClassificationOverride ? { classificationOverride: mergedClassificationOverride } : {}),
  };
}

export async function savePredictions(
  participantId: string,
  data: ParticipantPredictions
): Promise<void> {
  // Update champion/thirdPlace on participant row
  await prisma.participant.update({
    where: { id: participantId },
    data: {
      predictedChampion: data.champion,
      predictedThirdPlace: data.thirdPlace,
    },
  });

  // Upsert group predictions
  await Promise.all(
    Object.entries(data.groups).map(([gameIdStr, pred]) =>
      prisma.groupPrediction.upsert({
        where: { participantId_gameId: { participantId, gameId: Number(gameIdStr) } },
        update: { scoreA: pred.scoreA, scoreB: pred.scoreB },
        create: { participantId, gameId: Number(gameIdStr), scoreA: pred.scoreA, scoreB: pred.scoreB },
      })
    )
  );

  // Upsert knockout predictions
  await Promise.all(
    Object.entries(data.knockout).map(([gameIdStr, pred]) =>
      prisma.knockoutPrediction.upsert({
        where: { participantId_gameId: { participantId, gameId: Number(gameIdStr) } },
        update: { winner: pred.winner, scoreA: pred.scoreA ?? null, scoreB: pred.scoreB ?? null },
        create: {
          participantId,
          gameId: Number(gameIdStr),
          winner: pred.winner,
          scoreA: pred.scoreA ?? null,
          scoreB: pred.scoreB ?? null,
        },
      })
    )
  );
}

// ─── Results ────────────────────────────────────────────────────────────────

export async function getResults(): Promise<ActualResults> {
  const [groupRows, knockoutRows, knockoutTeamRows, settings] = await Promise.all([
    prisma.groupResult.findMany(),
    prisma.knockoutResult.findMany(),
    prisma.knockoutTeam.findMany(),
    prisma.tournamentSettings.findUnique({ where: { id: 1 } }),
  ]);

  const groups: ActualResults["groups"] = {};
  for (const r of groupRows) {
    groups[r.gameId] = { scoreA: r.scoreA, scoreB: r.scoreB };
  }

  const knockout: ActualResults["knockout"] = {};
  for (const r of knockoutRows) {
    knockout[r.gameId] = { winner: r.winner, scoreA: r.scoreA ?? undefined, scoreB: r.scoreB ?? undefined };
  }

  const knockoutTeams: ActualResults["knockoutTeams"] = {};
  for (const r of knockoutTeamRows) {
    knockoutTeams[r.gameId] = { teamA: r.teamA, teamB: r.teamB };
  }

  return {
    groups,
    knockout,
    knockoutTeams,
    champion: settings?.champion ?? null,
    thirdPlace: settings?.thirdPlace ?? null,
  };
}

export async function saveResults(results: ActualResults): Promise<void> {
  // Group results
  await Promise.all(
    Object.entries(results.groups).map(([gameIdStr, r]) =>
      prisma.groupResult.upsert({
        where: { gameId: Number(gameIdStr) },
        update: { scoreA: r.scoreA, scoreB: r.scoreB },
        create: { gameId: Number(gameIdStr), scoreA: r.scoreA, scoreB: r.scoreB },
      })
    )
  );

  // Knockout results
  await Promise.all(
    Object.entries(results.knockout).map(([gameIdStr, r]) =>
      prisma.knockoutResult.upsert({
        where: { gameId: Number(gameIdStr) },
        update: { winner: r.winner, scoreA: r.scoreA ?? null, scoreB: r.scoreB ?? null },
        create: {
          gameId: Number(gameIdStr),
          winner: r.winner,
          scoreA: r.scoreA ?? null,
          scoreB: r.scoreB ?? null,
        },
      })
    )
  );

  // Knockout teams
  if (results.knockoutTeams) {
    await Promise.all(
      Object.entries(results.knockoutTeams).map(([gameIdStr, t]) =>
        prisma.knockoutTeam.upsert({
          where: { gameId: Number(gameIdStr) },
          update: { teamA: t.teamA, teamB: t.teamB },
          create: { gameId: Number(gameIdStr), teamA: t.teamA, teamB: t.teamB },
        })
      )
    );
  }

  // Tournament settings
  await prisma.tournamentSettings.upsert({
    where: { id: 1 },
    update: { champion: results.champion, thirdPlace: results.thirdPlace },
    create: { id: 1, champion: results.champion, thirdPlace: results.thirdPlace },
  });
}

export async function saveKnockoutTeams(
  teams: Record<number, { teamA: string; teamB: string }>
): Promise<void> {
  await Promise.all(
    Object.entries(teams).map(([gameIdStr, t]) =>
      prisma.knockoutTeam.upsert({
        where: { gameId: Number(gameIdStr) },
        update: { teamA: t.teamA, teamB: t.teamB },
        create: { gameId: Number(gameIdStr), teamA: t.teamA, teamB: t.teamB },
      })
    )
  );
}

// ─── Game Prediction Stats ───────────────────────────────────────────────────

export interface GamePredictionStats {
  total: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  topScores: { scoreA: number; scoreB: number; count: number }[];
  othersCount: number;
}

export async function getKnockoutGameStats(gameId: number, teamA: string, teamB: string): Promise<GamePredictionStats> {
  const rows = await prisma.knockoutPrediction.findMany({
    where: { gameId, winner: { not: null } },
  });

  const total = rows.length;
  if (total === 0) return { total: 0, homeWins: 0, draws: 0, awayWins: 0, topScores: [], othersCount: 0 };

  let homeWins = 0;
  let awayWins = 0;

  for (const r of rows) {
    if (r.winner === teamA) homeWins++;
    else if (r.winner === teamB) awayWins++;
  }

  return { total, homeWins, draws: 0, awayWins, topScores: [], othersCount: total - homeWins - awayWins };
}

export async function getGroupGameStats(gameId: number): Promise<GamePredictionStats> {
  const rows = await prisma.groupPrediction.findMany({
    where: { gameId, scoreA: { not: null }, scoreB: { not: null } },
  });

  const total = rows.length;
  if (total === 0) return { total: 0, homeWins: 0, draws: 0, awayWins: 0, topScores: [], othersCount: 0 };

  let homeWins = 0, draws = 0, awayWins = 0;
  const scoreMap = new Map<string, number>();

  for (const r of rows) {
    const a = r.scoreA!, b = r.scoreB!;
    if (a > b) homeWins++;
    else if (a === b) draws++;
    else awayWins++;
    const key = `${a}-${b}`;
    scoreMap.set(key, (scoreMap.get(key) ?? 0) + 1);
  }

  const sorted = Array.from(scoreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => {
      const [scoreA, scoreB] = key.split("-").map(Number);
      return { scoreA, scoreB, count };
    });

  const topScores = sorted.slice(0, 3);
  const othersCount = total - topScores.reduce((s, e) => s + e.count, 0);
  return { total, homeWins, draws, awayWins, topScores, othersCount };
}

// ─── Live Score Toggle ────────────────────────────────────────────────────────

export async function getLiveScoreEnabled(): Promise<boolean> {
  const settings = await prisma.tournamentSettings.findUnique({ where: { id: 1 } });
  return settings?.liveScoreEnabled ?? true;
}

export async function setLiveScoreEnabled(enabled: boolean): Promise<void> {
  await prisma.tournamentSettings.upsert({
    where: { id: 1 },
    update: { liveScoreEnabled: enabled },
    create: { id: 1, liveScoreEnabled: enabled },
  });
}

// ─── Live Admin Settings ──────────────────────────────────────────────────────

export type LiveBannerTestMode = "pre" | "live" | "post" | null;

export interface LiveAdminSettings {
  liveStatsEnabled: boolean;
  liveMaxReqPerGame: number | null;
  liveBannerTestMode: LiveBannerTestMode;
}

export async function getLiveAdminSettings(): Promise<LiveAdminSettings> {
  const s = await prisma.tournamentSettings.findUnique({ where: { id: 1 } });
  return {
    liveStatsEnabled: s?.liveStatsEnabled ?? true,
    liveMaxReqPerGame: s?.liveMaxReqPerGame ?? null,
    liveBannerTestMode: (s?.liveBannerTestMode as LiveBannerTestMode) ?? null,
  };
}

export async function setLiveAdminSettings(settings: Partial<LiveAdminSettings>): Promise<void> {
  const current = await getLiveAdminSettings();
  const next = { ...current, ...settings };
  await prisma.tournamentSettings.upsert({
    where: { id: 1 },
    update: {
      liveStatsEnabled: next.liveStatsEnabled,
      liveMaxReqPerGame: next.liveMaxReqPerGame,
      liveBannerTestMode: next.liveBannerTestMode,
    },
    create: {
      id: 1,
      liveStatsEnabled: next.liveStatsEnabled,
      liveMaxReqPerGame: next.liveMaxReqPerGame,
      liveBannerTestMode: next.liveBannerTestMode,
    },
  });
}

// ─── Per-game live overrides ──────────────────────────────────────────────────

export interface GameOverrideEntry {
  liveEnabled: boolean;
  reqPerGame: number | null;
}

export async function getLiveGameOverrides(): Promise<Record<number, GameOverrideEntry>> {
  const rows = await prisma.liveGameOverride.findMany();
  const result: Record<number, GameOverrideEntry> = {};
  for (const r of rows) result[r.gameId] = { liveEnabled: r.liveEnabled, reqPerGame: r.reqPerGame ?? null };
  return result;
}

export async function setLiveGameOverride(gameId: number, patch: Partial<GameOverrideEntry>): Promise<void> {
  const existing = await prisma.liveGameOverride.findUnique({ where: { gameId } });
  await prisma.liveGameOverride.upsert({
    where: { gameId },
    update: patch,
    create: {
      gameId,
      liveEnabled: patch.liveEnabled ?? existing?.liveEnabled ?? true,
      reqPerGame: patch.reqPerGame !== undefined ? patch.reqPerGame : (existing?.reqPerGame ?? null),
    },
  });
}

// ─── Game Schedule Overrides ──────────────────────────────────────────────────

export interface GameScheduleOverride {
  gameId: number;
  date: string | null;
  stadium: string | null;
  teamA: string | null;
  teamB: string | null;
}

export async function getGameScheduleOverrides(): Promise<Record<number, GameScheduleOverride>> {
  const rows = await prisma.gameScheduleOverride.findMany();
  const result: Record<number, GameScheduleOverride> = {};
  for (const r of rows) {
    result[r.gameId] = { gameId: r.gameId, date: r.date, stadium: r.stadium, teamA: r.teamA, teamB: r.teamB };
  }
  return result;
}

export async function saveGameScheduleOverride(gameId: number, data: Omit<GameScheduleOverride, "gameId">): Promise<void> {
  await prisma.gameScheduleOverride.upsert({
    where: { gameId },
    update: data,
    create: { gameId, ...data },
  });
}

export async function deleteGameScheduleOverride(gameId: number): Promise<void> {
  await prisma.gameScheduleOverride.deleteMany({ where: { gameId } });
}

export async function getEffectiveGames(): Promise<Game[]> {
  const [overrides, knockoutTeamRows] = await Promise.all([
    getGameScheduleOverrides(),
    prisma.knockoutTeam.findMany(),
  ]);

  const knockoutTeams: Record<number, { teamA: string; teamB: string }> = {};
  for (const r of knockoutTeamRows) {
    knockoutTeams[r.gameId] = { teamA: r.teamA, teamB: r.teamB };
  }

  return GAMES.map((game) => {
    const ov = overrides[game.id];
    const kt = knockoutTeams[game.id];
    return {
      ...game,
      date: ov?.date ?? game.date,
      stadium: ov?.stadium ?? game.stadium,
      teamA: ov?.teamA ?? kt?.teamA ?? game.teamA,
      teamB: ov?.teamB ?? kt?.teamB ?? game.teamB,
    };
  });
}
