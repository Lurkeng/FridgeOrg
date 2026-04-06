-- FreshTrack v2 — Initial Schema
-- Cloudflare D1 (SQLite dialect)
-- Generated from src/db/schema.ts
--
-- Apply locally:   wrangler d1 execute freshtrack-db --local  --file=./drizzle/0001_initial.sql
-- Apply to prod:   wrangler d1 execute freshtrack-db --remote --file=./drizzle/0001_initial.sql

-- ── better-auth tables ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "user" (
  "id"             TEXT    PRIMARY KEY NOT NULL,
  "name"           TEXT    NOT NULL,
  "email"          TEXT    NOT NULL UNIQUE,
  "email_verified" INTEGER NOT NULL DEFAULT 0,
  "image"          TEXT,
  "household_id"   TEXT,
  "created_at"     INTEGER NOT NULL,
  "updated_at"     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id"          TEXT    PRIMARY KEY NOT NULL,
  "user_id"     TEXT    NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "token"       TEXT    NOT NULL UNIQUE,
  "expires_at"  INTEGER NOT NULL,
  "ip_address"  TEXT,
  "user_agent"  TEXT,
  "created_at"  INTEGER NOT NULL,
  "updated_at"  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "account" (
  "id"                       TEXT    PRIMARY KEY NOT NULL,
  "user_id"                  TEXT    NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "account_id"               TEXT    NOT NULL,
  "provider_id"              TEXT    NOT NULL,
  "access_token"             TEXT,
  "refresh_token"            TEXT,
  "access_token_expires_at"  INTEGER,
  "refresh_token_expires_at" INTEGER,
  "scope"                    TEXT,
  "password"                 TEXT,
  "created_at"               INTEGER NOT NULL,
  "updated_at"               INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id"         TEXT    PRIMARY KEY NOT NULL,
  "identifier" TEXT    NOT NULL,
  "value"      TEXT    NOT NULL,
  "expires_at" INTEGER NOT NULL,
  "created_at" INTEGER,
  "updated_at" INTEGER
);

-- ── App tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "households" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "created_by"  TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  "invite_code" TEXT NOT NULL UNIQUE,
  "created_at"  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "household_members" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "household_id" TEXT NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "user_id"      TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role"         TEXT NOT NULL DEFAULT 'member' CHECK("role" IN ('owner','member')),
  "joined_at"    TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "unique_household_user" ON "household_members"("household_id","user_id");
CREATE        INDEX IF NOT EXISTS "idx_hm_user"           ON "household_members"("user_id");

CREATE TABLE IF NOT EXISTS "food_items" (
  "id"                     TEXT    NOT NULL PRIMARY KEY,
  "household_id"           TEXT    NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "name"                   TEXT    NOT NULL,
  "category"               TEXT    NOT NULL DEFAULT 'other'
    CHECK("category" IN ('dairy','meat','poultry','seafood','produce','grains','beverages','condiments','leftovers','frozen_meals','snacks','other')),
  "location"               TEXT    NOT NULL DEFAULT 'fridge'
    CHECK("location" IN ('fridge','freezer','pantry')),
  "quantity"               REAL    NOT NULL DEFAULT 1,
  "unit"                   TEXT    NOT NULL DEFAULT 'item',
  "added_date"             TEXT    NOT NULL,
  "expiry_date"            TEXT    NOT NULL,
  "opened"                 INTEGER          DEFAULT 0,
  "opened_date"            TEXT,
  "notes"                  TEXT,
  "barcode"                TEXT,
  "shelf"                  TEXT,
  -- Nutrition per 100 g (populated from barcode scan via OpenFoodFacts)
  "nutrition_calories"     REAL,
  "nutrition_protein"      REAL,
  "nutrition_carbs"        REAL,
  "nutrition_fat"          REAL,
  "nutrition_fiber"        REAL,
  "nutrition_sugar"        REAL,
  "nutrition_sodium"       REAL,
  "nutrition_serving_size" TEXT,
  "created_by"             TEXT    REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at"             TEXT    NOT NULL,
  "updated_at"             TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_fi_household" ON "food_items"("household_id");
CREATE INDEX IF NOT EXISTS "idx_fi_expiry"    ON "food_items"("expiry_date");
CREATE INDEX IF NOT EXISTS "idx_fi_location"  ON "food_items"("location");
CREATE INDEX IF NOT EXISTS "idx_fi_barcode"   ON "food_items"("barcode");

CREATE TABLE IF NOT EXISTS "waste_logs" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "household_id"   TEXT NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "item_name"      TEXT NOT NULL,
  "category"       TEXT NOT NULL
    CHECK("category" IN ('dairy','meat','poultry','seafood','produce','grains','beverages','condiments','leftovers','frozen_meals','snacks','other')),
  "quantity"       REAL NOT NULL DEFAULT 1,
  "unit"           TEXT NOT NULL DEFAULT 'item',
  "reason"         TEXT NOT NULL
    CHECK("reason" IN ('expired','spoiled','leftover','other')),
  "estimated_cost" REAL NOT NULL DEFAULT 0,
  "wasted_date"    TEXT NOT NULL,
  "created_at"     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_wl_household" ON "waste_logs"("household_id");
CREATE INDEX IF NOT EXISTS "idx_wl_date"      ON "waste_logs"("wasted_date");

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id"          TEXT    NOT NULL PRIMARY KEY,
  "user_id"     TEXT    NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
  "days_before" INTEGER NOT NULL DEFAULT 2,
  "enabled"     INTEGER          DEFAULT 1,
  "created_at"  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipe_preferences" (
  "id"                   TEXT    NOT NULL PRIMARY KEY,
  "user_id"              TEXT    NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
  "meal_goal"            TEXT,
  "calorie_range"        TEXT,
  "protein_target"       TEXT,
  "servings"             INTEGER NOT NULL DEFAULT 2,
  "dietary_restrictions" TEXT    NOT NULL DEFAULT '[]',
  "updated_at"           TEXT    NOT NULL
);
