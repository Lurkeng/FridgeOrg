-- FreshTrack v2 — Achievements / Gamification
-- Apply locally:   wrangler d1 execute freshtrack-db --local  --file=./drizzle/0003_achievements.sql
-- Apply to prod:   wrangler d1 execute freshtrack-db --remote --file=./drizzle/0003_achievements.sql

CREATE TABLE IF NOT EXISTS "achievements" (
  "id"              TEXT PRIMARY KEY,
  "user_id"         TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "achievement_key" TEXT NOT NULL,
  "unlocked_at"     TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_achievement" ON "achievements"("user_id", "achievement_key");
