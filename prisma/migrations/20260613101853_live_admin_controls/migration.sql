ALTER TABLE "tournament_settings"
  ADD COLUMN IF NOT EXISTS "liveStatsEnabled"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "liveMaxReqPerGame" INTEGER;

CREATE TABLE IF NOT EXISTS "live_game_overrides" (
  "gameId"      INTEGER NOT NULL,
  "liveEnabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "live_game_overrides_pkey" PRIMARY KEY ("gameId")
);
