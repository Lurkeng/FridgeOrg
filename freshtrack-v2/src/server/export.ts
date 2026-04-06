import { createServerFn } from "@tanstack/react-start";
import { getDb, schema } from "@/db";
import { eq, asc, desc } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";

// ── Helpers ────────────────────────────────────────────────────────────────

async function getUserHouseholdId(db: ReturnType<typeof getDb>, userId: string) {
  const member = await db
    .select({ householdId: schema.householdMembers.householdId })
    .from(schema.householdMembers)
    .where(eq(schema.householdMembers.userId, userId))
    .limit(1);
  return member[0]?.householdId ?? null;
}

// ── EXPORT all user data ──────────────────────────────────────────────────

export const exportAllData = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb(context.env.DB);
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) {
      return {
        exportedAt: new Date().toISOString(),
        household: null,
        foodItems: [],
        shoppingList: [],
        wasteLogs: [],
      };
    }

    const [household, foodItems, shoppingList, wasteLogs] = await Promise.all([
      db
        .select()
        .from(schema.households)
        .where(eq(schema.households.id, householdId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      db
        .select()
        .from(schema.foodItems)
        .where(eq(schema.foodItems.householdId, householdId))
        .orderBy(asc(schema.foodItems.expiryDate)),
      db
        .select()
        .from(schema.shoppingListItems)
        .where(eq(schema.shoppingListItems.householdId, householdId))
        .orderBy(asc(schema.shoppingListItems.createdAt)),
      db
        .select()
        .from(schema.wasteLogs)
        .where(eq(schema.wasteLogs.householdId, householdId))
        .orderBy(desc(schema.wasteLogs.wastedDate)),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      household,
      foodItems,
      shoppingList,
      wasteLogs,
    };
  });
