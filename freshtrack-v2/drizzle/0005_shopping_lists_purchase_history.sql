-- FreshTrack v2 — Multiple shopping lists + purchase history

CREATE TABLE IF NOT EXISTS "shopping_lists" (
  "id"           TEXT PRIMARY KEY,
  "household_id" TEXT NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "is_default"   INTEGER NOT NULL DEFAULT 0,
  "created_by"   TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at"   TEXT NOT NULL,
  "updated_at"   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_sl_household" ON "shopping_lists"("household_id");
CREATE INDEX IF NOT EXISTS "idx_sl_default" ON "shopping_lists"("household_id", "is_default");

ALTER TABLE "shopping_list_items" ADD COLUMN "list_id" TEXT REFERENCES "shopping_lists"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_sli_list" ON "shopping_list_items"("list_id");

CREATE TABLE IF NOT EXISTS "purchase_history" (
  "id"                       TEXT PRIMARY KEY,
  "household_id"             TEXT NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "list_id"                  TEXT REFERENCES "shopping_lists"("id") ON DELETE SET NULL,
  "source_shopping_item_id"  TEXT,
  "name"                     TEXT NOT NULL,
  "category"                 TEXT NOT NULL DEFAULT 'other',
  "quantity"                 REAL NOT NULL DEFAULT 1,
  "unit"                     TEXT NOT NULL DEFAULT 'item',
  "price"                    REAL,
  "store"                    TEXT,
  "barcode"                  TEXT,
  "stored_location"          TEXT NOT NULL,
  "purchased_at"             TEXT NOT NULL,
  "created_by"               TEXT REFERENCES "user"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_ph_household" ON "purchase_history"("household_id");
CREATE INDEX IF NOT EXISTS "idx_ph_list" ON "purchase_history"("list_id");
CREATE INDEX IF NOT EXISTS "idx_ph_purchased_at" ON "purchase_history"("purchased_at");
