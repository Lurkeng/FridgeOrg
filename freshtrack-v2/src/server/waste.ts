import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { eq, desc, and, gte } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import { FoodCategory } from "@/types";
import { getUserHouseholdId } from "@/server/household-context";

// ── GET waste logs ─────────────────────────────────────────────────────────

export const getWasteLogs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return [];

    return db
      .select()
      .from(schema.wasteLogs)
      .where(eq(schema.wasteLogs.householdId, householdId))
      .orderBy(desc(schema.wasteLogs.wastedDate))
      .limit(200);
  });

// ── GET waste stats ────────────────────────────────────────────────────────

export const getWasteStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) {
      return { totalWasted: 0, totalCost: 0, byCategory: {}, byReason: {}, weeklyTrend: [], topWastedItems: [] };
    }

    // Last 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const logs = await db
      .select()
      .from(schema.wasteLogs)
      .where(
        and(
          eq(schema.wasteLogs.householdId, householdId),
          gte(schema.wasteLogs.wastedDate, cutoffStr)
        )
      );

    // Aggregate
    const byCategory: Record<string, number> = {};
    const byReason: Record<string, number> = {};
    const byItemName: Record<string, number> = {};
    const byWeek: Record<string, { count: number; cost: number }> = {};
    let totalWasted = 0;
    let totalCost = 0;

    for (const log of logs) {
      totalWasted += log.quantity;
      totalCost += log.estimatedCost;
      byCategory[log.category] = (byCategory[log.category] ?? 0) + log.quantity;
      byReason[log.reason] = (byReason[log.reason] ?? 0) + 1;
      byItemName[log.itemName] = (byItemName[log.itemName] ?? 0) + 1;

      // ISO week key
      const d = new Date(log.wastedDate);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];
      if (!byWeek[weekKey]) byWeek[weekKey] = { count: 0, cost: 0 };
      byWeek[weekKey].count += log.quantity;
      byWeek[weekKey].cost  += log.estimatedCost;
    }

    const weeklyTrend = Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, v]) => ({ week, ...v }));

    const topWastedItems = Object.entries(byItemName)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalWasted,
      totalCost,
      byCategory: byCategory as Record<FoodCategory, number>,
      byReason,
      weeklyTrend,
      topWastedItems,
    };
  });

// ── ADD manual waste log ───────────────────────────────────────────────────

export const addWasteLog = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({
    itemName:      z.string().min(1),
    category:      z.string(),
    quantity:      z.number().positive(),
    unit:          z.string(),
    reason:        z.enum(["expired","spoiled","leftover","other"]),
    estimatedCost: z.number().nonnegative(),
    wastedDate:    z.string(),
  }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");

    const [log] = await db
      .insert(schema.wasteLogs)
      .values({ ...data, householdId, category: data.category as typeof schema.wasteLogs.$inferInsert["category"] })
      .returning();
    return log;
  });
