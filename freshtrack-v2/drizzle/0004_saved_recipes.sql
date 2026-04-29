-- FreshTrack v2 — Saved custom recipes and AI favourites

CREATE TABLE IF NOT EXISTS "saved_recipes" (
  "id"                 TEXT PRIMARY KEY,
  "user_id"            TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "household_id"       TEXT REFERENCES "households"("id") ON DELETE CASCADE,
  "source"             TEXT NOT NULL,
  "title"              TEXT NOT NULL,
  "ingredients"        TEXT NOT NULL,
  "instructions"       TEXT NOT NULL,
  "tags"               TEXT NOT NULL DEFAULT '[]',
  "prep_time"          INTEGER NOT NULL DEFAULT 20,
  "servings"           INTEGER NOT NULL DEFAULT 2,
  "estimated_macros"   TEXT,
  "original_recipe_id" TEXT,
  "created_at"         TEXT NOT NULL,
  "updated_at"         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_saved_recipes_user" ON "saved_recipes"("user_id");
CREATE INDEX IF NOT EXISTS "idx_saved_recipes_household" ON "saved_recipes"("household_id");
