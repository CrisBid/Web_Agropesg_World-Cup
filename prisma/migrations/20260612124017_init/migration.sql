-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "predictedChampion" TEXT,
    "predictedThirdPlace" TEXT,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_predictions" (
    "participantId" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "scoreA" INTEGER,
    "scoreB" INTEGER,

    CONSTRAINT "group_predictions_pkey" PRIMARY KEY ("participantId","gameId")
);

-- CreateTable
CREATE TABLE "knockout_predictions" (
    "participantId" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "winner" TEXT,
    "scoreA" INTEGER,
    "scoreB" INTEGER,

    CONSTRAINT "knockout_predictions_pkey" PRIMARY KEY ("participantId","gameId")
);

-- CreateTable
CREATE TABLE "group_results" (
    "gameId" INTEGER NOT NULL,
    "scoreA" INTEGER NOT NULL,
    "scoreB" INTEGER NOT NULL,

    CONSTRAINT "group_results_pkey" PRIMARY KEY ("gameId")
);

-- CreateTable
CREATE TABLE "knockout_results" (
    "gameId" INTEGER NOT NULL,
    "scoreA" INTEGER,
    "scoreB" INTEGER,
    "winner" TEXT NOT NULL,

    CONSTRAINT "knockout_results_pkey" PRIMARY KEY ("gameId")
);

-- CreateTable
CREATE TABLE "knockout_teams" (
    "gameId" INTEGER NOT NULL,
    "teamA" TEXT NOT NULL,
    "teamB" TEXT NOT NULL,

    CONSTRAINT "knockout_teams_pkey" PRIMARY KEY ("gameId")
);

-- CreateTable
CREATE TABLE "tournament_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "champion" TEXT,
    "thirdPlace" TEXT,

    CONSTRAINT "tournament_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participants_phone_key" ON "participants"("phone");

-- AddForeignKey
ALTER TABLE "group_predictions" ADD CONSTRAINT "group_predictions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knockout_predictions" ADD CONSTRAINT "knockout_predictions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
