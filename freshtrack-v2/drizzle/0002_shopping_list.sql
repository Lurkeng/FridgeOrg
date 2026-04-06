-- FreshTrack v2 — Shopping List + Kassalapp price comparison
-- Apply locally:   wrangler d1 execute freshtrack-db --local  --file=./drizzle/0002_shopping_list.sql
-- Apply to prod:   wrangler d1 execute freshtrack-db --remote --file=./drizzle/0002_shopping_list.sql

CREATE TABLE IF NOT EXISTS "shopping_list_items" (
  "id"                    TEXT PRIMARY KEY,
  "household_id"          TEXT NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "name"                  TEXT NOT NULL,
  "category"              TEXT NOT NULL DEFAULT 'other',
  "quantity"              REAL NOT NULL DEFAULT 1,
  "unit"                  TEXT NOT NULL DEFAULT 'item',
  "checked"               INTEGER NOT NULL DEFAULT 0,
  "notes"                 TEXT,
  "barcode"               TEXT,
  "kassalapp_product_id"  INTEGER,
  "cheapest_store"        TEXT,
  "cheapest_price"        REAL,
  "comparison_prices"     TEXT,
  "added_by"              TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at"            TEXT NOT NULL,
  "updated_at"            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_sli_household" ON "shopping_list_items"("household_id");
CREATE INDEX IF NOT EXISTS "idx_sli_checked"   ON "shopping_list_items"("checked");
