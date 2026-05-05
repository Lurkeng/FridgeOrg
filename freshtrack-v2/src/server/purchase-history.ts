import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { authMiddleware } from "@/middleware/auth";
import { getUserHouseholdId } from "@/server/household-context";

export const getPurchaseHistorySummary = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) {
      return {
        monthItemsBought: 0,
        mostBoughtCategory: null,
        estimatedSpend: 0,
        topRepeatedItem: null,
        repeatedItems: [],
        categoryTrend: [],
        storeTrend: [],
        wasteAvoidedOpportunities: [],
      };
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthIso = monthStart.toISOString();

    const [monthCountRow] = await db
      .select({ cnt: sql<number>`count(*)` })
      .from(schema.purchaseHistory)
      .where(and(eq(schema.purchaseHistory.householdId, householdId), sql`${schema.purchaseHistory.purchasedAt} >= ${monthIso}`));

    const [spendRow] = await db
      .select({ total: sql<number>`coalesce(sum(${schema.purchaseHistory.price}), 0)` })
      .from(schema.purchaseHistory)
      .where(and(eq(schema.purchaseHistory.householdId, householdId), sql`${schema.purchaseHistory.purchasedAt} >= ${monthIso}`));

    const [topCategoryRow] = await db
      .select({
        category: schema.purchaseHistory.category,
        cnt: sql<number>`count(*)`,
      })
      .from(schema.purchaseHistory)
      .where(eq(schema.purchaseHistory.householdId, householdId))
      .groupBy(schema.purchaseHistory.category)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    const repeatedRows = await db
      .select({
        name: schema.purchaseHistory.name,
        category: schema.purchaseHistory.category,
        cnt: sql<number>`count(*)`,
      })
      .from(schema.purchaseHistory)
      .where(eq(schema.purchaseHistory.householdId, householdId))
      .groupBy(schema.purchaseHistory.name)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    const categoryTrendRows = await db
      .select({
        category: schema.purchaseHistory.category,
        cnt: sql<number>`count(*)`,
      })
      .from(schema.purchaseHistory)
      .where(and(eq(schema.purchaseHistory.householdId, householdId), sql`${schema.purchaseHistory.purchasedAt} >= ${monthIso}`))
      .groupBy(schema.purchaseHistory.category)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    const storeTrendRows = await db
      .select({
        store: schema.purchaseHistory.store,
        cnt: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(${schema.purchaseHistory.price}), 0)`,
      })
      .from(schema.purchaseHistory)
      .where(and(eq(schema.purchaseHistory.householdId, householdId), sql`${schema.purchaseHistory.store} IS NOT NULL`))
      .groupBy(schema.purchaseHistory.store)
      .orderBy(desc(sql`count(*)`))
      .limit(3);

    const wasteRows = await db
      .select({
        name: schema.wasteLogs.itemName,
        cnt: sql<number>`count(*)`,
      })
      .from(schema.wasteLogs)
      .where(eq(schema.wasteLogs.householdId, householdId))
      .groupBy(schema.wasteLogs.itemName)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const wastedNames = new Set(wasteRows.map((row) => row.name.toLowerCase()));
    const wasteAvoidedOpportunities = repeatedRows
      .filter((row) => !wastedNames.has(row.name.toLowerCase()))
      .slice(0, 3)
      .map((row) => ({ name: row.name, count: Number(row.cnt ?? 0) }));

    return {
      monthItemsBought: Number(monthCountRow?.cnt ?? 0),
      mostBoughtCategory: topCategoryRow?.category ?? null,
      estimatedSpend: Number(spendRow?.total ?? 0),
      topRepeatedItem: repeatedRows[0]?.name ?? null,
      repeatedItems: repeatedRows.map((row) => ({ name: row.name, category: row.category, count: Number(row.cnt ?? 0) })),
      categoryTrend: categoryTrendRows.map((row) => ({ category: row.category, count: Number(row.cnt ?? 0) })),
      storeTrend: storeTrendRows.map((row) => ({ store: row.store ?? "Unknown", count: Number(row.cnt ?? 0), total: Number(row.total ?? 0) })),
      wasteAvoidedOpportunities,
    };
  });
