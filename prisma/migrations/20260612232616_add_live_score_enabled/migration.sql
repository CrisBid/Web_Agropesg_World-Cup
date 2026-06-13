ALTER TABLE "tournament_settings" ADD COLUMN IF NOT EXISTS "liveScoreEnabled" BOOLEAN NOT NULL DEFAULT true;
