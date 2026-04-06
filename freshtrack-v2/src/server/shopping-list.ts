import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { eq, and, asc, desc, lte, gte, sql } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import { KassalappClient, buildPriceComparison } from "@/lib/kassalapp";

// ── Helpers ────────────────────────────────────────────────────────────────

async function getUserHouseholdId(db: ReturnType<typeof getDb>, userId: string) {
  const member = await db
    .select({ householdId: schema.householdMembers.householdId })
    .from(schema.householdMembers)
    .where(eq(schema.householdMembers.userId, userId))
    .limit(1);
  return member[0]?.householdId ?? null;
}

const FOOD_CATEGORIES = [
  "dairy","meat","poultry","seafood","produce","grains",
  "beverages","condiments","leftovers","frozen_meals","snacks","other",
] as const;

// ── GET all shopping list items ───────────────────────────────────────────

export const getShoppingList = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb(context.env.DB);
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return [];

    return db
      .select()
      .from(schema.shoppingListItems)
      .where(eq(schema.shoppingListItems.householdId, householdId))
      .orderBy(asc(schema.shoppingListItems.checked), asc(schema.shoppingListItems.createdAt));
  });

// ── ADD item ──────────────────────────────────────────────────────────────

const addItemSchema = z.object({
  name:     z.string().min(1).max(200),
  category: z.enum(FOOD_CATEGORIES),
  quantity: z.number().positive(),
  unit:     z.string().max(50),
  notes:    z.string().nullable().optional(),
  barcode:  z.string().nullable().optional(),
});

export const addShoppingItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(addItemSchema)
  .handler(async ({ context, data }) => {
    const db = getDb(context.env.DB);
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household — join or create one first");

    const [item] = await db
      .insert(schema.shoppingListItems)
      .values({
        name:     data.name,
        category: data.category,
        quantity: data.quantity,
        unit:     data.unit,
        notes:    data.notes ?? null,
        barcode:  data.barcode ?? null,
        checked:  false,
        householdId,
        addedBy:  context.userId,
      })
      .returning();

    return item;
  });

// ── TOGGLE checked ────────────────────────────────────────────────────────

export const toggleShoppingItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string(), checked: z.boolean() }))
  .handler(async ({ context, data }) => {
    const db = getDb(context.env.DB);
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    const [item] = await db
      .update(schema.shoppingListItems)
      .set({ checked: data.checked, updatedAt: new Date().toISOString() })
      .where(and(eq(schema.shoppingListItems.id, data.id), eq(schema.shoppingListItems.householdId, householdId)))
      .returning();
    if (!item) throw new Error("Item not found");
    return item;
  });

// ── UPDATE item ───────────────────────────────────────────────────────────

export const updateShoppingItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({
    id: z.string(),
    updates: z.object({
      name:     z.string().min(1).optional(),
      category: z.string().optional(),
      quantity: z.number().positive().optional(),
      unit:     z.string().optional(),
      notes:    z.string().nullable().optional(),
    }),
  }))
  .handler(async ({ context, data }) => {
    const db = getDb(context.env.DB);
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    const [item] = await db
      .update(schema.shoppingListItems)
      .set({
        ...(data.updates as Partial<typeof schema.shoppingListItems.$inferInsert>),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(schema.shoppingListItems.id, data.id), eq(schema.shoppingListItems.householdId, householdId)))
      .returning();
    if (!item) throw new Error("Item not found");
    return item;
  });

// ── DELETE item ───────────────────────────────────────────────────────────

export const deleteShoppingItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const db = getDb(context.env.DB);
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    await db.delete(schema.shoppingListItems).where(and(eq(schema.shoppingListItems.id, data.id), eq(schema.shoppingListItems.householdId, householdId)));
    return { success: true };
  });

// ── CLEAR checked items ───────────────────────────────────────────────────

export const clearCheckedItems = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb(context.env.DB);
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return { deleted: 0 };

    await db
      .delete(schema.shoppingListItems)
      .where(
        and(
          eq(schema.shoppingListItems.householdId, householdId),
          eq(schema.shoppingListItems.checked, true),
        ),
      );
    return { success: true };
  });

// ── FETCH PRICES (Kassalapp) ──────────────────────────────────────────────

export const fetchItemPrices = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const db = getDb(context.env.DB);
    const apiKey = context.env.KASSALAPP_API_KEY;
    if (!apiKey) throw new Error("KASSALAPP_API_KEY not configured");

    const [item] = await db
      .select()
      .from(schema.shoppingListItems)
      .where(eq(schema.shoppingListItems.id, data.id));
    if (!item) throw new Error("Item not found");

    const client = new KassalappClient(apiKey);

    // Prefer EAN lookup when we have a barcode, fall back to search
    const results = item.barcode
      ? await client.getProductByEan(item.barcode)
      : await client.searchProducts(item.name, { size: 10 });

    if (!results.data.length) return { prices: [] };

    const comparison = buildPriceComparison(results.data);
    const cheapest = comparison[0] ?? null;

    // Persist the price data on the item
    await db
      .update(schema.shoppingListItems)
      .set({
        kassalappProductId: results.data[0]?.id ?? null,
        cheapestStore:      cheapest?.store ?? null,
        cheapestPrice:      cheapest?.price ?? null,
        comparisonPrices:   JSON.stringify(comparison),
        updatedAt:          new Date().toISOString(),
      })
      .where(eq(schema.shoppingListItems.id, data.id));

    return { prices: comparison };
  });

// ── FETCH ALL PRICES (bulk — called from the UI "Compare prices" button) ─

export const fetchAllPrices = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb(context.env.DB);
    const apiKey = context.env.KASSALAPP_API_KEY;
    if (!apiKey) throw new Error("KASSALAPP_API_KEY not configured");

    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return { updated: 0 };

    // Get all unchecked items
    const items = await db
      .select()
      .from(schema.shoppingListItems)
      .where(
        and(
          eq(schema.shoppingListItems.householdId, householdId),
          eq(schema.shoppingListItems.checked, false),
        ),
      );

    const client = new KassalappClient(apiKey);
    let updated = 0;

    // Fetch prices sequentially (respecting 60 req/min rate limit)
    for (const item of items) {
      try {
        const results = item.barcode
          ? await client.getProductByEan(item.barcode)
          : await client.searchProducts(item.name, { size: 10 });

        if (results.data.length) {
          const comparison = buildPriceComparison(results.data);
          const cheapest = comparison[0] ?? null;

          await db
            .update(schema.shoppingListItems)
            .set({
              kassalappProductId: results.data[0]?.id ?? null,
              cheapestStore:      cheapest?.store ?? null,
              cheapestPrice:      cheapest?.price ?? null,
              comparisonPrices:   JSON.stringify(comparison),
              updatedAt:          new Date().toISOString(),
            })
            .where(eq(schema.shoppingListItems.id, item.id));
          updated++;
        }
      } catch {
        // Skip individual item failures (rate limit, etc.)
        continue;
      }
    }

    return { updated };
  });

// ── GET restock predictions (purchase pattern analysis) ──────────────────

export const getRestockPredictions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb(context.env.DB);
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return { predictions: [] };

    // 1) Analyze food_items purchase patterns — group by lower(name)
    const foodPatterns = await db
      .select({
        name:     sql<string>`lower(${schema.foodItems.name})`.as("item_name"),
        category: schema.foodItems.category,
        count:    sql<number>`count(*)`.as("purchase_count"),
        minDate:  sql<string>`min(${schema.foodItems.addedDate})`.as("min_date"),
        maxDate:  sql<string>`max(${schema.foodItems.addedDate})`.as("max_date"),
      })
      .from(schema.foodItems)
      .where(eq(schema.foodItems.householdId, householdId))
      .groupBy(sql`lower(${schema.foodItems.name})`)
      .having(sql`count(*) >= 2`);

    // 2) Also check waste_logs for additional purchase pattern signals
    const wastePatterns = await db
      .select({
        name:     sql<string>`lower(${schema.wasteLogs.itemName})`.as("item_name"),
        category: schema.wasteLogs.category,
        count:    sql<number>`count(*)`.as("purchase_count"),
        minDate:  sql<string>`min(${schema.wasteLogs.wastedDate})`.as("min_date"),
        maxDate:  sql<string>`max(${schema.wasteLogs.wastedDate})`.as("max_date"),
      })
      .from(schema.wasteLogs)
      .where(eq(schema.wasteLogs.householdId, householdId))
      .groupBy(sql`lower(${schema.wasteLogs.itemName})`)
      .having(sql`count(*) >= 2`);

    // 3) Merge patterns — prefer food_items data, supplement with waste_logs
    const patternMap = new Map<string, {
      name: string;
      category: string;
      count: number;
      minDate: string;
      maxDate: string;
    }>();

    for (const row of foodPatterns) {
      patternMap.set(row.name, {
        name: row.name,
        category: row.category,
        count: row.count,
        minDate: row.minDate,
        maxDate: row.maxDate,
      });
    }

    for (const row of wastePatterns) {
      const existing = patternMap.get(row.name);
      if (!existing) {
        patternMap.set(row.name, {
          name: row.name,
          category: row.category,
          count: row.count,
          minDate: row.minDate,
          maxDate: row.maxDate,
        });
      } else {
        // Merge: extend date range and add counts
        const mergedMinDate = row.minDate < existing.minDate ? row.minDate : existing.minDate;
        const mergedMaxDate = row.maxDate > existing.maxDate ? row.maxDate : existing.maxDate;
        patternMap.set(row.name, {
          ...existing,
          count: existing.count + row.count,
          minDate: mergedMinDate,
          maxDate: mergedMaxDate,
        });
      }
    }

    // 4) Compute predictions
    const now = new Date();
    const todayJulian = Math.floor(now.getTime() / 86400000);

    const predictions: Array<{
      name: string;
      category: string;
      averageIntervalDays: number;
      daysSinceLastPurchase: number;
      daysUntilNeeded: number;
      purchaseCount: number;
    }> = [];

    for (const pattern of Array.from(patternMap.values())) {
      if (pattern.count < 2) continue;

      const minJulian = Math.floor(new Date(pattern.minDate).getTime() / 86400000);
      const maxJulian = Math.floor(new Date(pattern.maxDate).getTime() / 86400000);

      const dateRange = maxJulian - minJulian;
      if (dateRange <= 0) continue;

      const averageInterval = dateRange / (pattern.count - 1);
      const daysSinceLast = todayJulian - maxJulian;
      const daysUntilNeeded = Math.round(averageInterval - daysSinceLast);

      // Only include if due within 3 days or overdue
      if (daysUntilNeeded > 3) continue;

      predictions.push({
        name: pattern.name,
        category: pattern.category,
        averageIntervalDays: Math.round(averageInterval),
        daysSinceLastPurchase: daysSinceLast,
        daysUntilNeeded,
        purchaseCount: pattern.count,
      });
    }

    // 5) Filter out items already on shopping list or in current inventory
    const currentShoppingItems = await db
      .select({ name: schema.shoppingListItems.name })
      .from(schema.shoppingListItems)
      .where(eq(schema.shoppingListItems.householdId, householdId));

    const currentFoodItems = await db
      .select({ name: schema.foodItems.name })
      .from(schema.foodItems)
      .where(eq(schema.foodItems.householdId, householdId));

    const shoppingNames = new Set(currentShoppingItems.map((i) => i.name.toLowerCase()));
    const inventoryNames = new Set(currentFoodItems.map((i) => i.name.toLowerCase()));

    const filtered = predictions
      .filter((p) => !shoppingNames.has(p.name) && !inventoryNames.has(p.name))
      .sort((a, b) => a.daysUntilNeeded - b.daysUntilNeeded)
      .slice(0, 10);

    return { predictions: filtered };
  });

// ── GET restock suggestions (waste-log history + expiring items) ─────────

export const getRestockSuggestions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb(context.env.DB);
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return { recentItems: [], expiringItems: [] };

    // 1) Recent distinct items from waste_logs — things the user has used/wasted
    //    before and might want to restock. Group by name (case-insensitive) and
    //    pick the 20 most recently logged entries.
    const wasteRaw = await db
      .select({
        name:     schema.wasteLogs.itemName,
        category: schema.wasteLogs.category,
        maxDate:  sql<string>`max(${schema.wasteLogs.createdAt})`.as("max_date"),
      })
      .from(schema.wasteLogs)
      .where(eq(schema.wasteLogs.householdId, householdId))
      .groupBy(sql`lower(${schema.wasteLogs.itemName})`)
      .orderBy(desc(sql`max(${schema.wasteLogs.createdAt})`))
      .limit(20);

    const recentItems = wasteRaw.map((r) => ({ name: r.name, category: r.category }));

    // 2) Food items expiring within 3 days — suggest restocking these
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];
    const futureStr = threeDaysFromNow.toISOString().split("T")[0];

    const expiringRows = await db
      .select({
        name:       schema.foodItems.name,
        category:   schema.foodItems.category,
        expiryDate: schema.foodItems.expiryDate,
      })
      .from(schema.foodItems)
      .where(
        and(
          eq(schema.foodItems.householdId, householdId),
          lte(schema.foodItems.expiryDate, futureStr),
          gte(schema.foodItems.expiryDate, todayStr),
        ),
      )
      .orderBy(asc(schema.foodItems.expiryDate))
      .limit(10);

    const expiringItems = expiringRows.map((r) => ({
      name:       r.name,
      category:   r.category,
      expiryDate: r.expiryDate,
    }));

    // Filter out recent items that already exist in the current shopping list
    const currentItems = await db
      .select({ name: schema.shoppingListItems.name })
      .from(schema.shoppingListItems)
      .where(eq(schema.shoppingListItems.householdId, householdId));

    const currentNames = new Set(currentItems.map((i) => i.name.toLowerCase()));

    const filteredRecent = recentItems.filter(
      (item) => !currentNames.has(item.name.toLowerCase()),
    );
    const filteredExpiring = expiringItems.filter(
      (item) => !currentNames.has(item.name.toLowerCase()),
    );

    return { recentItems: filteredRecent, expiringItems: filteredExpiring };
  });
