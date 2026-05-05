import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { eq, and, asc, desc, lte, gte, sql } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import { getUserHouseholdId } from "@/server/household-context";
import { resolveActiveListId } from "@/server/shopping-list-active";
import { mergePatterns, computePredictions } from "@/lib/shopping-list/predictions";

export const getRestockPredictions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ listId: z.string().optional() }).optional())
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return { predictions: [] };
    const activeListId = await resolveActiveListId(db, householdId, context.userId, data?.listId);

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

    const patternMap = mergePatterns(foodPatterns, wastePatterns);
    const predictions = computePredictions(patternMap, new Date());

    const currentShoppingItems = await db
      .select({ name: schema.shoppingListItems.name })
      .from(schema.shoppingListItems)
      .where(and(eq(schema.shoppingListItems.householdId, householdId), eq(schema.shoppingListItems.listId, activeListId)));

    const currentFoodItems = await db
      .select({ name: schema.foodItems.name })
      .from(schema.foodItems)
      .where(eq(schema.foodItems.householdId, householdId));

    const shoppingNames = new Set(currentShoppingItems.map((i) => i.name.toLowerCase()));
    const inventoryNames = new Set(currentFoodItems.map((i) => i.name.toLowerCase()));

    const filtered = predictions
      .filter((p) => !shoppingNames.has(p.name) && !inventoryNames.has(p.name))
      .slice(0, 10);

    return { predictions: filtered };
  });

export const getRestockSuggestions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ listId: z.string().optional() }).optional())
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return { recentItems: [], expiringItems: [] };
    const activeListId = await resolveActiveListId(db, householdId, context.userId, data?.listId);

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

    const currentItems = await db
      .select({ name: schema.shoppingListItems.name })
      .from(schema.shoppingListItems)
      .where(and(eq(schema.shoppingListItems.householdId, householdId), eq(schema.shoppingListItems.listId, activeListId)));

    const currentNames = new Set(currentItems.map((i) => i.name.toLowerCase()));

    const filteredRecent = recentItems.filter(
      (item) => !currentNames.has(item.name.toLowerCase()),
    );
    const filteredExpiring = expiringItems.filter(
      (item) => !currentNames.has(item.name.toLowerCase()),
    );

    return { recentItems: filteredRecent, expiringItems: filteredExpiring };
  });
