import { getDb, schema } from "@/db";
import { eq, and, sql } from "drizzle-orm";

export async function ensureDefaultShoppingList(
  db: ReturnType<typeof getDb>,
  householdId: string,
  userId: string,
) {
  const [existingDefault] = await db
    .select()
    .from(schema.shoppingLists)
    .where(and(eq(schema.shoppingLists.householdId, householdId), eq(schema.shoppingLists.isDefault, true)))
    .limit(1);

  if (existingDefault) return existingDefault;

  const now = new Date().toISOString();
  const [created] = await db
    .insert(schema.shoppingLists)
    .values({
      householdId,
      name: "Main List",
      description: "Default household shopping list",
      isDefault: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db
    .update(schema.shoppingListItems)
    .set({ listId: created.id, updatedAt: now })
    .where(and(eq(schema.shoppingListItems.householdId, householdId), sql`${schema.shoppingListItems.listId} IS NULL`));

  return created;
}

export async function resolveActiveList(
  db: ReturnType<typeof getDb>,
  householdId: string,
  userId: string,
  listId?: string,
) {
  const defaultList = await ensureDefaultShoppingList(db, householdId, userId);
  if (!listId) return defaultList;

  const [list] = await db
    .select()
    .from(schema.shoppingLists)
    .where(and(eq(schema.shoppingLists.id, listId), eq(schema.shoppingLists.householdId, householdId)))
    .limit(1);

  return list ?? defaultList;
}

export async function resolveActiveListId(
  db: ReturnType<typeof getDb>,
  householdId: string,
  userId: string,
  listId?: string,
) {
  const list = await resolveActiveList(db, householdId, userId, listId);
  return list.id;
}
