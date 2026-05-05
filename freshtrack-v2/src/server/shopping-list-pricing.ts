import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import { KassalappClient, buildPriceComparison } from "@/lib/kassalapp";
import { getUserHouseholdId } from "@/server/household-context";
import { resolveActiveListId } from "@/server/shopping-list-active";

export const fetchItemPrices = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string(), listId: z.string().optional() }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const apiKey = context.env.KASSALAPP_API_KEY;
    if (!apiKey) throw new Error("KASSALAPP_API_KEY not configured");
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    const activeListId = await resolveActiveListId(db, householdId, context.userId, data.listId);

    const [item] = await db
      .select()
      .from(schema.shoppingListItems)
      .where(
        and(
          eq(schema.shoppingListItems.id, data.id),
          eq(schema.shoppingListItems.householdId, householdId),
          eq(schema.shoppingListItems.listId, activeListId),
        ),
      );
    if (!item) throw new Error("Item not found");

    const client = new KassalappClient(apiKey);
    const results = item.barcode
      ? await client.getProductByEan(item.barcode)
      : await client.searchProducts(item.name, { size: 10 });

    if (!results.data.length) return { prices: [] };

    const comparison = buildPriceComparison(results.data);
    const cheapest = comparison[0] ?? null;

    await db
      .update(schema.shoppingListItems)
      .set({
        kassalappProductId: results.data[0]?.id ?? null,
        cheapestStore:      cheapest?.store ?? null,
        cheapestPrice:      cheapest?.price ?? null,
        comparisonPrices:   JSON.stringify(comparison),
        updatedAt:          new Date().toISOString(),
      })
      .where(
        and(
          eq(schema.shoppingListItems.id, data.id),
          eq(schema.shoppingListItems.householdId, householdId),
          eq(schema.shoppingListItems.listId, activeListId),
        ),
      );

    return { prices: comparison };
  });

export const fetchAllPrices = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ listId: z.string().optional() }).optional())
  .handler(async ({ context, data }) => {
    const db = getDb();
    const apiKey = context.env.KASSALAPP_API_KEY;
    if (!apiKey) throw new Error("KASSALAPP_API_KEY not configured");

    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return { updated: 0 };
    const activeListId = await resolveActiveListId(db, householdId, context.userId, data?.listId);

    const items = await db
      .select()
      .from(schema.shoppingListItems)
      .where(
        and(
          eq(schema.shoppingListItems.householdId, householdId),
          eq(schema.shoppingListItems.listId, activeListId),
          eq(schema.shoppingListItems.checked, false),
        ),
      );

    const client = new KassalappClient(apiKey);
    let updated = 0;

    for (const item of items) {
      try {
        const results = item.barcode
          ? await client.getProductByEan(item.barcode)
          : await client.searchProducts(item.name, { size: 10 });

        if (results.data.length) {
          const comparison = buildPriceComparison(results.data);
          const cheapest = comparison[0] ?? null;

          await db
            .update(schema.shoppingListItems)
            .set({
              kassalappProductId: results.data[0]?.id ?? null,
              cheapestStore:      cheapest?.store ?? null,
              cheapestPrice:      cheapest?.price ?? null,
              comparisonPrices:   JSON.stringify(comparison),
              updatedAt:          new Date().toISOString(),
            })
            .where(and(eq(schema.shoppingListItems.id, item.id), eq(schema.shoppingListItems.listId, activeListId)));
          updated++;
        }
      } catch {
        continue;
      }
    }

    return { updated };
  });
