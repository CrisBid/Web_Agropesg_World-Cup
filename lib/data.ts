import { prisma } from "./prisma";
import type { ParticipantPredictions, ActualResults } from "./scoring";

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
  const [participant, groupRows, knockoutRows] = await Promise.all([
    prisma.participant.findUnique({ where: { id: participantId } }),
    prisma.groupPrediction.findMany({ where: { participantId } }),
    prisma.knockoutPrediction.findMany({ where: { participantId } }),
  ]);

  const groups: ParticipantPredictions["groups"] = {};
  for (const r of groupRows) {
    groups[r.gameId] = { scoreA: r.scoreA, scoreB: r.scoreB };
  }

  const knockout: ParticipantPredictions["knockout"] = {};
  for (const r of knockoutRows) {
    knockout[r.gameId] = { winner: r.winner, scoreA: r.scoreA, scoreB: r.scoreB };
  }

  return {
    groups,
    knockout,
    champion: participant?.predictedChampion ?? null,
    thirdPlace: participant?.predictedThirdPlace ?? null,
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
