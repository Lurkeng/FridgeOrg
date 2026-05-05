import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, schema, FOOD_CATEGORIES } from "@/db";
import { eq, and, asc } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import { getUserHouseholdId } from "@/server/household-context";
import { resolveActiveList } from "@/server/shopping-list-active";

const activeListInput = z.object({ listId: z.string().optional() }).optional();

const addItemSchema = z.object({
  listId:   z.string().optional(),
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
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household — join or create one first");
    const activeList = await resolveActiveList(db, householdId, context.userId, data.listId);

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
        listId: activeList.id,
        householdId,
        addedBy:  context.userId,
      })
      .returning();

    return item;
  });

export const toggleShoppingItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string(), checked: z.boolean(), listId: z.string().optional() }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    const activeList = await resolveActiveList(db, householdId, context.userId, data.listId);
    const [item] = await db
      .update(schema.shoppingListItems)
      .set({ checked: data.checked, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(schema.shoppingListItems.id, data.id),
          eq(schema.shoppingListItems.householdId, householdId),
          eq(schema.shoppingListItems.listId, activeList.id),
        ),
      )
      .returning();
    if (!item) throw new Error("Item not found");
    return item;
  });

export const updateShoppingItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({
    listId: z.string().optional(),
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
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    const activeList = await resolveActiveList(db, householdId, context.userId, data.listId);
    const [item] = await db
      .update(schema.shoppingListItems)
      .set({
        ...(data.updates as Partial<typeof schema.shoppingListItems.$inferInsert>),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(schema.shoppingListItems.id, data.id),
          eq(schema.shoppingListItems.householdId, householdId),
          eq(schema.shoppingListItems.listId, activeList.id),
        ),
      )
      .returning();
    if (!item) throw new Error("Item not found");
    return item;
  });

export const deleteShoppingItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string(), listId: z.string().optional() }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    const activeList = await resolveActiveList(db, householdId, context.userId, data.listId);
    await db.delete(schema.shoppingListItems).where(
      and(
        eq(schema.shoppingListItems.id, data.id),
        eq(schema.shoppingListItems.householdId, householdId),
        eq(schema.shoppingListItems.listId, activeList.id),
      ),
    );
    return { success: true };
  });

export const clearCheckedItems = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(activeListInput)
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return { deleted: 0 };
    const activeList = await resolveActiveList(db, householdId, context.userId, data?.listId);

    await db
      .delete(schema.shoppingListItems)
      .where(
        and(
          eq(schema.shoppingListItems.householdId, householdId),
          eq(schema.shoppingListItems.listId, activeList.id),
          eq(schema.shoppingListItems.checked, true),
        ),
      );
    return { success: true, listId: activeList.id };
  });
