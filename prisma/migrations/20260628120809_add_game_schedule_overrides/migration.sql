-- CreateTable
CREATE TABLE "game_schedule_overrides" (
    "gameId" INTEGER NOT NULL,
    "date"    TEXT,
    "stadium" TEXT,
    "teamA"   TEXT,
    "teamB"   TEXT,

    CONSTRAINT "game_schedule_overrides_pkey" PRIMARY KEY ("gameId")
);
