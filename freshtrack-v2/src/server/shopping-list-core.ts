import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, schema, FOOD_CATEGORIES } from "@/db";
import { eq, and, asc } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import { getUserHouseholdId } from "@/server/household-context";

const addItemSchema = z.object({
  name:     z.string().min(1).max(200),
  category: z.enum(FOOD_CATEGORIES),
  quantity: z.number().positive(),
  unit:     z.string().max(50),
  notes:    z.string().nullable().optional(),
  barcode:  z.string().nullable().optional(),
});

export const getShoppingList = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return [];

    return db
      .select()
      .from(schema.shoppingListItems)
      .where(eq(schema.shoppingListItems.householdId, householdId))
      .orderBy(asc(schema.shoppingListItems.checked), asc(schema.shoppingListItems.createdAt));
  });

export const addShoppingItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(addItemSchema)
  .handler(async ({ context, data }) => {
    const db = getDb();
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

export const toggleShoppingItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string(), checked: z.boolean() }))
  .handler(async ({ context, data }) => {
    const db = getDb();
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
    const db = getDb();
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

export const deleteShoppingItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    await db.delete(schema.shoppingListItems).where(and(eq(schema.shoppingListItems.id, data.id), eq(schema.shoppingListItems.householdId, householdId)));
    return { success: true };
  });

export const clearCheckedItems = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
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
