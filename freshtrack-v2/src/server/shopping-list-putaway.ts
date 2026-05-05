import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { eq, and, inArray } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import { getUserHouseholdId } from "@/server/household-context";
import { resolveActiveList } from "@/server/shopping-list-active";
import { buildFoodRows, buildPurchaseRows } from "@/lib/shopping-list/put-away";

const putAwaySchema = z.object({
  listId: z.string().optional(),
  itemIds: z.array(z.string()).min(1),
  defaultLocation: z.enum(["fridge", "freezer", "pantry"]),
  itemOverrides: z.array(
    z.object({
      id: z.string(),
      location: z.enum(["fridge", "freezer", "pantry"]).optional(),
      expiryDate: z.string().optional(),
      shelf: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
  ).optional(),
});

const undoPutAwaySchema = z.object({
  listId: z.string().optional(),
  batchId: z.string(),
});

export const putAwayShoppingItems = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(putAwaySchema)
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    const activeList = await resolveActiveList(db, householdId, context.userId, data.listId);

    const checkedItems = await db
      .select()
      .from(schema.shoppingListItems)
      .where(
        and(
          eq(schema.shoppingListItems.householdId, householdId),
          eq(schema.shoppingListItems.listId, activeList.id),
          eq(schema.shoppingListItems.checked, true),
          inArray(schema.shoppingListItems.id, data.itemIds),
        ),
      );

    if (!checkedItems.length) {
      return { imported: 0, listId: activeList.id, items: [] };
    }

    const overrideMap = new Map((data.itemOverrides ?? []).map((entry) => [entry.id, entry]));
    const now = new Date();
    const nowIso = now.toISOString();

    const foodRows = buildFoodRows(checkedItems, overrideMap, data.defaultLocation, now, householdId, context.userId);
    const purchaseRows = buildPurchaseRows(checkedItems, overrideMap, data.defaultLocation, activeList.id, householdId, context.userId, nowIso);

    const insertedInventory = await db.insert(schema.foodItems).values(foodRows).returning();
    await db.insert(schema.purchaseHistory).values(purchaseRows);
    await db
      .delete(schema.shoppingListItems)
      .where(
        and(
          eq(schema.shoppingListItems.householdId, householdId),
          eq(schema.shoppingListItems.listId, activeList.id),
          inArray(schema.shoppingListItems.id, checkedItems.map((i) => i.id)),
        ),
      );

    return { imported: insertedInventory.length, listId: activeList.id, batchId: nowIso, items: insertedInventory };
  });

export const undoPutAwayShoppingItems = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(undoPutAwaySchema)
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    const activeList = await resolveActiveList(db, householdId, context.userId, data.listId);

    const historyRows = await db
      .select()
      .from(schema.purchaseHistory)
      .where(
        and(
          eq(schema.purchaseHistory.householdId, householdId),
          eq(schema.purchaseHistory.listId, activeList.id),
          eq(schema.purchaseHistory.purchasedAt, data.batchId),
        ),
      );

    if (!historyRows.length) return { restored: 0, listId: activeList.id };

    await db
      .insert(schema.shoppingListItems)
      .values(historyRows.map((item) => ({
        householdId,
        listId: activeList.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        barcode: item.barcode,
        checked: true,
        addedBy: context.userId,
      })));

    await db
      .delete(schema.foodItems)
      .where(
        and(
          eq(schema.foodItems.householdId, householdId),
          eq(schema.foodItems.createdAt, data.batchId),
        ),
      );

    await db
      .delete(schema.purchaseHistory)
      .where(
        and(
          eq(schema.purchaseHistory.householdId, householdId),
          eq(schema.purchaseHistory.listId, activeList.id),
          eq(schema.purchaseHistory.purchasedAt, data.batchId),
        ),
      );

    return { restored: historyRows.length, listId: activeList.id };
  });
