-- FreshTrack v2 — Notification preference settings

ALTER TABLE "notification_preferences" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'in_app';
ALTER TABLE "notification_preferences" ADD COLUMN "digest_cadence" TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE "notification_preferences" ADD COLUMN "quiet_hours_start" TEXT NOT NULL DEFAULT '22:00';
ALTER TABLE "notification_preferences" ADD COLUMN "quiet_hours_end" TEXT NOT NULL DEFAULT '07:00';
ALTER TABLE "notification_preferences" ADD COLUMN "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;
