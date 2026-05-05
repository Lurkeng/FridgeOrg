import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { eq, and, asc, desc } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import { getUserHouseholdId } from "@/server/household-context";
import { ensureDefaultShoppingList, resolveActiveList } from "@/server/shopping-list-active";

const shoppingListSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const listMutationSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().nullable().optional(),
});

const renameListSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
});

const deleteListSchema = z.object({ id: z.string() });

export const getShoppingLists = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return { lists: [], activeListId: null };

    const defaultList = await ensureDefaultShoppingList(db, householdId, context.userId);
    const lists = await db
      .select()
      .from(schema.shoppingLists)
      .where(eq(schema.shoppingLists.householdId, householdId))
      .orderBy(desc(schema.shoppingLists.isDefault), asc(schema.shoppingLists.name));

    return {
      lists,
      activeListId: defaultList.id,
    };
  });

export const createShoppingList = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(listMutationSchema)
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    await ensureDefaultShoppingList(db, householdId, context.userId);

    const now = new Date().toISOString();
    const [created] = await db
      .insert(schema.shoppingLists)
      .values({
        householdId,
        name: data.name.trim(),
        description: data.description ?? null,
        isDefault: false,
        createdBy: context.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created;
  });

export const renameShoppingList = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(renameListSchema)
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");

    const [updated] = await db
      .update(schema.shoppingLists)
      .set({ name: data.name.trim(), updatedAt: new Date().toISOString() })
      .where(and(eq(schema.shoppingLists.id, data.id), eq(schema.shoppingLists.householdId, householdId)))
      .returning();

    if (!updated) throw new Error("List not found");
    return updated;
  });

export const deleteShoppingList = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(deleteListSchema)
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");

    const defaultList = await ensureDefaultShoppingList(db, householdId, context.userId);
    if (defaultList.id === data.id) throw new Error("Cannot delete default list");

    await db
      .update(schema.shoppingListItems)
      .set({ listId: defaultList.id, updatedAt: new Date().toISOString() })
      .where(and(eq(schema.shoppingListItems.householdId, householdId), eq(schema.shoppingListItems.listId, data.id)));

    await db
      .delete(schema.shoppingLists)
      .where(and(eq(schema.shoppingLists.id, data.id), eq(schema.shoppingLists.householdId, householdId)));

    return { success: true, fallbackListId: defaultList.id };
  });

export const setDefaultShoppingList = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(deleteListSchema)
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");

    const [list] = await db
      .select()
      .from(schema.shoppingLists)
      .where(and(eq(schema.shoppingLists.id, data.id), eq(schema.shoppingLists.householdId, householdId)))
      .limit(1);
    if (!list) throw new Error("List not found");

    await db
      .update(schema.shoppingLists)
      .set({ isDefault: false, updatedAt: new Date().toISOString() })
      .where(eq(schema.shoppingLists.householdId, householdId));

    const [updated] = await db
      .update(schema.shoppingLists)
      .set({ isDefault: true, updatedAt: new Date().toISOString() })
      .where(and(eq(schema.shoppingLists.id, data.id), eq(schema.shoppingLists.householdId, householdId)))
      .returning();

    return updated;
  });

export const getShoppingList = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ listId: z.string().optional() }).optional())
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return { list: null, items: [] };

    const activeList = await resolveActiveList(db, householdId, context.userId, data?.listId);

    const items = await db
      .select()
      .from(schema.shoppingListItems)
      .where(
        and(
          eq(schema.shoppingListItems.householdId, householdId),
          eq(schema.shoppingListItems.listId, activeList.id),
        ),
      )
      .orderBy(asc(schema.shoppingListItems.checked), asc(schema.shoppingListItems.createdAt));

    return {
      list: shoppingListSchema.parse(activeList),
      items,
    };
  });
