import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { eq, and, gte, like, sql } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import { getUserHouseholdId } from "@/server/household-context";

// ── Helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Count consecutive days with zero waste, going back from today. Cap at 365. */
async function computeWasteStreak(
  db: ReturnType<typeof getDb>,
  householdId: string,
): Promise<number> {
  // Fetch all distinct waste dates in the last 365 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);
  const cutoffStr = toDateStr(cutoff);

  const wasteDates = await db
    .selectDistinct({ wastedDate: schema.wasteLogs.wastedDate })
    .from(schema.wasteLogs)
    .where(
      and(
        eq(schema.wasteLogs.householdId, householdId),
        gte(schema.wasteLogs.wastedDate, cutoffStr),
      ),
    );

  const wasteDateSet = new Set(wasteDates.map((r) => r.wastedDate));

  let streak = 0;
  const d = new Date();
  // Start from today and go back day by day
  for (let i = 0; i < 365; i++) {
    const dateStr = toDateStr(d);
    if (wasteDateSet.has(dateStr)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Letter grade A-F based on current vs previous month waste count. */
async function computeMonthlyWasteScore(
  db: ReturnType<typeof getDb>,
  householdId: string,
): Promise<"A" | "B" | "C" | "D" | "F"> {
  const now = new Date();
  const thisMonthStart = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastMonthStart = toDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const thisMonthLogs = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(schema.wasteLogs)
    .where(
      and(
        eq(schema.wasteLogs.householdId, householdId),
        gte(schema.wasteLogs.wastedDate, thisMonthStart),
      ),
    );

  const lastMonthLogs = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(schema.wasteLogs)
    .where(
      and(
        eq(schema.wasteLogs.householdId, householdId),
        gte(schema.wasteLogs.wastedDate, lastMonthStart),
        sql`${schema.wasteLogs.wastedDate} < ${thisMonthStart}`,
      ),
    );

  const thisCount = Number(thisMonthLogs[0]?.cnt ?? 0);
  const lastCount = Number(lastMonthLogs[0]?.cnt ?? 0);

  if (lastCount === 0) return "B"; // No previous month data

  const changePercent = ((thisCount - lastCount) / lastCount) * 100;
  if (changePercent <= -50) return "A";
  if (changePercent <= -20) return "B";
  if (changePercent <= 0) return "C";
  if (changePercent <= 20) return "D";
  return "F";
}

// ── GET achievements + dynamic stats ─────────────────────────────────────

export const getAchievements = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);

    // All achievements for this user
    const achievements = await db
      .select()
      .from(schema.achievements)
      .where(eq(schema.achievements.userId, context.userId));

    // Dynamic stats
    const wasteStreak = householdId
      ? await computeWasteStreak(db, householdId)
      : 0;

    const monthlyWasteScore = householdId
      ? await computeMonthlyWasteScore(db, householdId)
      : "B" as const;

    // totalItemsTracked = current food items + waste logs (ever)
    let totalItemsTracked = 0;
    if (householdId) {
      const [fiCount] = await db
        .select({ cnt: sql<number>`count(*)` })
        .from(schema.foodItems)
        .where(eq(schema.foodItems.householdId, householdId));
      const [wlCount] = await db
        .select({ cnt: sql<number>`count(*)` })
        .from(schema.wasteLogs)
        .where(eq(schema.wasteLogs.householdId, householdId));
      totalItemsTracked = Number(fiCount?.cnt ?? 0) + Number(wlCount?.cnt ?? 0);
    }

    // totalRecipesCooked = count of achievements starting with "recipe_cooked_"
    const recipeAchievements = achievements.filter((a) =>
      a.achievementKey.startsWith("recipe_cooked_"),
    );

    return {
      achievements: achievements.map((a) => ({
        id: a.id,
        userId: a.userId,
        achievementKey: a.achievementKey,
        unlockedAt: a.unlockedAt,
      })),
      wasteStreak,
      monthlyWasteScore,
      totalItemsTracked,
      totalRecipesCooked: recipeAchievements.length,
    };
  });

// ── POST check & unlock achievements ────────────────────────────────────

export const checkAndUnlockAchievements = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);

    // Get existing achievements for this user
    const existing = await db
      .select({ key: schema.achievements.achievementKey })
      .from(schema.achievements)
      .where(eq(schema.achievements.userId, context.userId));
    const existingKeys = new Set(existing.map((a) => a.key));

    const newlyUnlocked: string[] = [];

    async function tryUnlock(key: string, condition: () => Promise<boolean>) {
      if (existingKeys.has(key)) return;
      if (await condition()) {
        await db.insert(schema.achievements).values({
          userId: context.userId,
          achievementKey: key,
        });
        newlyUnlocked.push(key);
      }
    }

    if (householdId) {
      // first_item: at least 1 food item
      await tryUnlock("first_item", async () => {
        const [row] = await db
          .select({ cnt: sql<number>`count(*)` })
          .from(schema.foodItems)
          .where(eq(schema.foodItems.householdId, householdId));
        return Number(row?.cnt ?? 0) >= 1;
      });

      // first_scan: at least 1 food item with barcode
      await tryUnlock("first_scan", async () => {
        const [row] = await db
          .select({ cnt: sql<number>`count(*)` })
          .from(schema.foodItems)
          .where(
            and(
              eq(schema.foodItems.householdId, householdId),
              sql`${schema.foodItems.barcode} IS NOT NULL AND ${schema.foodItems.barcode} != ''`,
            ),
          );
        return Number(row?.cnt ?? 0) >= 1;
      });

      // week_without_waste: wasteStreak >= 7
      await tryUnlock("week_without_waste", async () => {
        const streak = await computeWasteStreak(db, householdId);
        return streak >= 7;
      });

      // month_without_waste: wasteStreak >= 30
      await tryUnlock("month_without_waste", async () => {
        const streak = await computeWasteStreak(db, householdId);
        return streak >= 30;
      });

      // inventory_master: 20+ food items tracked
      await tryUnlock("inventory_master", async () => {
        const [fiCount] = await db
          .select({ cnt: sql<number>`count(*)` })
          .from(schema.foodItems)
          .where(eq(schema.foodItems.householdId, householdId));
        const [wlCount] = await db
          .select({ cnt: sql<number>`count(*)` })
          .from(schema.wasteLogs)
          .where(eq(schema.wasteLogs.householdId, householdId));
        return Number(fiCount?.cnt ?? 0) + Number(wlCount?.cnt ?? 0) >= 20;
      });

      // price_hunter: at least 1 shopping list item with cheapestPrice set
      await tryUnlock("price_hunter", async () => {
        const [row] = await db
          .select({ cnt: sql<number>`count(*)` })
          .from(schema.shoppingListItems)
          .where(
            and(
              eq(schema.shoppingListItems.householdId, householdId),
              sql`${schema.shoppingListItems.cheapestPrice} IS NOT NULL`,
            ),
          );
        return Number(row?.cnt ?? 0) >= 1;
      });
    }

    // chef_mode: 5+ recipe_cooked_ achievements (including any just unlocked above)
    await tryUnlock("chef_mode", async () => {
      const [row] = await db
        .select({ cnt: sql<number>`count(*)` })
        .from(schema.achievements)
        .where(
          and(
            eq(schema.achievements.userId, context.userId),
            like(schema.achievements.achievementKey, "recipe_cooked_%"),
          ),
        );
      return Number(row?.cnt ?? 0) >= 5;
    });

    return { unlocked: newlyUnlocked };
  });

// ── POST log a recipe cooked ─────────────────────────────────────────────

export const logRecipeCooked = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({
    recipeTitle: z.string().min(1),
  }))
  .handler(async ({ context, data }) => {
    const db = getDb();

    // Create a unique achievement key per recipe cook event
    const key = `recipe_cooked_${Date.now()}`;
    await db.insert(schema.achievements).values({
      userId: context.userId,
      achievementKey: key,
    });

    // Check if chef_mode should be unlocked (5+ recipes)
    const [recipeCount] = await db
      .select({ cnt: sql<number>`count(*)` })
      .from(schema.achievements)
      .where(
        and(
          eq(schema.achievements.userId, context.userId),
          like(schema.achievements.achievementKey, "recipe_cooked_%"),
        ),
      );

    let chefModeUnlocked = false;
    if (Number(recipeCount?.cnt ?? 0) >= 5) {
      const [existing] = await db
        .select()
        .from(schema.achievements)
        .where(
          and(
            eq(schema.achievements.userId, context.userId),
            eq(schema.achievements.achievementKey, "chef_mode"),
          ),
        )
        .limit(1);

      if (!existing) {
        await db.insert(schema.achievements).values({
          userId: context.userId,
          achievementKey: "chef_mode",
        });
        chefModeUnlocked = true;
      }
    }

    return { key, chefModeUnlocked };
  });
