import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import { KassalappClient, processProducts, extractPriceDrops, type KassalProduct, type PriceDropProduct } from "@/lib/kassalapp";

// ── Helpers ────────────────────────────────────────────────────────────────

async function getUserHouseholdId(db: ReturnType<typeof getDb>, userId: string) {
  const member = await db
    .select({ householdId: schema.householdMembers.householdId })
    .from(schema.householdMembers)
    .where(eq(schema.householdMembers.userId, userId))
    .limit(1);
  return member[0]?.householdId ?? null;
}

export interface StoreTotalEntry {
  store: string;
  logo: string | null;
  total: number;
  itemCount: number;
  totalItems: number;
}

// ── SEARCH products on Kassalapp ──────────────────────────────────────────

export const searchProducts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({
    query: z.string().min(1).max(200),
    page:  z.number().optional(),
    sort:  z.string().optional(),
  }))
  .handler(async ({ context, data }) => {
    const apiKey = context.env.KASSALAPP_API_KEY;
    if (!apiKey) throw new Error("KASSALAPP_API_KEY not configured");

    const client = new KassalappClient(apiKey);
    const result = await client.searchProducts(data.query, {
      page: data.page ?? 1,
      size: 20,
      sort: data.sort,
    });

    // Filter nulls, dedupe by store, sort by price
    const processed = processProducts(result.data);

    return {
      products: processed,
      meta: result.meta,
    };
  });

// ── MATCH deals to shopping list items ────────────────────────────────────
// Checks each unchecked shopping list item for the best deal on Kassalapp

export const getDealsForShoppingList = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb(context.env.DB);
    const apiKey = context.env.KASSALAPP_API_KEY;
    if (!apiKey) return { deals: [], storeTotals: [], missingKey: true };

    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return { deals: [], storeTotals: [], missingKey: false };

    // Get unchecked shopping list items
    const items = await db
      .select()
      .from(schema.shoppingListItems)
      .where(
        and(
          eq(schema.shoppingListItems.householdId, householdId),
          eq(schema.shoppingListItems.checked, false),
        ),
      );

    if (!items.length) return { deals: [], storeTotals: [], missingKey: false };

    const client = new KassalappClient(apiKey);
    const deals: {
      shoppingItemId: string;
      shoppingItemName: string;
      products: KassalProduct[];
    }[] = [];

    // Track per-store totals across all items for "best store" summary
    // Map<storeName, { logo, total, itemCount }>
    const storeAgg = new Map<string, { logo: string | null; total: number; itemCount: number }>();

    // Look up each item — limit to first 10 to respect rate limits
    for (const item of items.slice(0, 10)) {
      try {
        const results = item.barcode
          ? await client.getProductByEan(item.barcode)
          : await client.searchProducts(item.name, { size: 12 });

        if (results.data.length) {
          const processed = processProducts(results.data);
          deals.push({
            shoppingItemId:   item.id,
            shoppingItemName: item.name,
            products:         processed.slice(0, 6),
          });

          // Aggregate store totals: for each store that has this item, add cheapest price
          for (const p of processed) {
            const storeName = p.store!.name;
            const existing = storeAgg.get(storeName);
            if (existing) {
              // Only count this item once per store (processed is already deduped by store)
              existing.total += p.current_price!;
              existing.itemCount += 1;
            } else {
              storeAgg.set(storeName, {
                logo: p.store!.logo,
                total: p.current_price!,
                itemCount: 1,
              });
            }
          }
        }
      } catch {
        continue;
      }
    }

    // Build sorted store totals — prefer stores that carry more items, then by price
    const totalItems = deals.length;
    const storeTotals: StoreTotalEntry[] = Array.from(storeAgg.entries())
      .map(([store, agg]) => ({
        store,
        logo: agg.logo,
        total: agg.total,
        itemCount: agg.itemCount,
        totalItems,
      }))
      // Sort: more items covered first, then cheapest total
      .sort((a, b) => b.itemCount - a.itemCount || a.total - b.total)
      .slice(0, 8);

    return { deals, storeTotals, missingKey: false };
  });

// ── SELECT a specific product for a shopping list item ───────────────────
// Called when user picks a store/product from the deals page

export const selectDealForItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({
    shoppingItemId: z.string(),
    productId:      z.number(),
    storeName:      z.string(),
    price:          z.number(),
  }))
  .handler(async ({ context, data }) => {
    const db = getDb(context.env.DB);

    await db
      .update(schema.shoppingListItems)
      .set({
        kassalappProductId: data.productId,
        cheapestStore:      data.storeName,
        cheapestPrice:      data.price,
        updatedAt:          new Date().toISOString(),
      })
      .where(eq(schema.shoppingListItems.id, data.shoppingItemId));

    return { success: true };
  });

// ── PRICE DROPS — detect recent discounts from price history ─────────────
// Searches common grocery categories and finds products with recent price drops.

export const getPriceDrops = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({
    /** Common grocery search terms to find products with price history */
    categories: z.array(z.string()).optional(),
  }))
  .handler(async ({ context, data }) => {
    const apiKey = context.env.KASSALAPP_API_KEY;
    if (!apiKey) return { drops: [], missingKey: true };

    const client = new KassalappClient(apiKey);

    // Search a few common categories to find popular products with EANs
    const searchTerms = data.categories ?? ["melk", "brød", "ost", "kjøtt", "fisk", "yoghurt", "juice", "egg"];
    const allEans = new Set<string>();

    // Gather EANs from product searches (limit API calls)
    for (const term of searchTerms.slice(0, 6)) {
      try {
        const results = await client.searchProducts(term, { size: 10 });
        for (const p of results.data) {
          if (p.ean) allEans.add(p.ean);
        }
      } catch {
        continue;
      }
    }

    if (allEans.size === 0) return { drops: [], missingKey: false };

    // Fetch bulk price history for discovered EANs (max 100 per call)
    const eanList = Array.from(allEans).slice(0, 100);
    try {
      const historyResult = await client.getBulkPriceHistory(eanList, 30);
      const drops = extractPriceDrops(historyResult.data);
      return { drops: drops.slice(0, 30), missingKey: false };
    } catch {
      return { drops: [], missingKey: false };
    }
  });

// ── FIND nearby stores ────────────────────────────────────────────────────

export const findNearbyStores = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({
    lat:    z.number(),
    lng:    z.number(),
    km:     z.number().optional(),
    search: z.string().optional(),
  }))
  .handler(async ({ context, data }) => {
    const apiKey = context.env.KASSALAPP_API_KEY;
    if (!apiKey) throw new Error("KASSALAPP_API_KEY not configured");

    const client = new KassalappClient(apiKey);
    const result = await client.getPhysicalStores({
      lat: data.lat,
      lng: data.lng,
      km:  data.km ?? 5,
      search: data.search,
      size: 20,
    });

    return { stores: result.data };
  });
