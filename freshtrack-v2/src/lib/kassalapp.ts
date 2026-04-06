/**
 * Kassalapp API client — Norwegian grocery price comparison.
 *
 * Docs: https://kassal.app/docs/api
 * Free tier: 60 req/min, Bearer token auth.
 */

const BASE_URL = "https://kassal.app/api/v1";

interface KassalappPaginatedResponse<T> {
  data: T[];
  links: { first: string; last: string; prev: string | null; next: string | null };
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

// ── Product shapes ──────────────────────────────────────────────────────────

export interface KassalProduct {
  id: number;
  name: string;
  brand: string | null;
  vendor: string | null;
  ean: string | null;
  description: string | null;
  image: string | null;
  current_price: number | null;
  current_unit_price: number | null;
  store: { name: string; code: string; logo: string | null } | null;
  category: string[];
  allergens: string[];
  nutrition: Record<string, string | number>[];
  weight: number | null;
  weight_unit: string | null;
  created_at: string;
  updated_at: string;
}

export interface KassalPriceHistoryEntry {
  price: number;
  date: string;    // ISO date
}

export interface KassalBulkPriceResult {
  ean: string;
  products: {
    id: number;
    name: string;
    brand: string | null;
    ean: string;
    image: string | null;
    store: { name: string; code: string; logo: string | null } | null;
    current_price: number | null;
    current_unit_price: number | null;
    price_history: KassalPriceHistoryEntry[];
  }[];
}

export interface KassalPhysicalStore {
  id: number;
  group: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  logo: string | null;
  position: { lat: number; lng: number } | null;
  openingHours: Record<string, string> | null;
}

// ── Client ──────────────────────────────────────────────────────────────────

export class KassalappClient {
  constructor(private apiKey: string) {}

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Kassalapp ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Kassalapp ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  // ── Products ────────────────────────────────────────────────────────────

  /** Free-text search for products. Returns paginated results.
   * NOTE: Do NOT pass sort=price_asc — Kassalapp treats null-priced products as
   * price=0 and sorts them first, returning zero usable price results.
   * Default (no sort) uses relevance order and returns priced store entries first.
   */
  async searchProducts(query: string, opts?: { size?: number; page?: number; sort?: string }) {
    const params: Record<string, string> = {
      search: query,
      size:   String(opts?.size ?? 12),
      page:   String(opts?.page ?? 1),
    };
    if (opts?.sort) params.sort = opts.sort;
    return this.get<KassalappPaginatedResponse<KassalProduct>>("/products", params);
  }

  /** Look up a product by EAN barcode. */
  async getProductByEan(ean: string) {
    return this.get<KassalappPaginatedResponse<KassalProduct>>(`/products/ean/${ean}`);
  }

  /** Get a single product by Kassalapp ID. */
  async getProductById(id: number) {
    return this.get<{ data: KassalProduct }>(`/products/id/${id}`);
  }

  // ── Price history ───────────────────────────────────────────────────────

  /**
   * Bulk price history for up to 100 EANs.
   * Returns price history per EAN with per-store product entries.
   */
  async getBulkPriceHistory(eans: string[], days = 30) {
    return this.post<{ data: KassalBulkPriceResult[] }>("/products/prices-bulk", {
      products: eans,
      days,
    });
  }

  // ── Physical stores ─────────────────────────────────────────────────────

  /** Search physical store locations, optionally by proximity. */
  async getPhysicalStores(opts?: { search?: string; lat?: number; lng?: number; km?: number; size?: number; page?: number }) {
    return this.get<KassalappPaginatedResponse<KassalPhysicalStore>>("/physical-stores", {
      search: opts?.search ?? "",
      lat:    opts?.lat != null ? String(opts.lat) : "",
      lng:    opts?.lng != null ? String(opts.lng) : "",
      km:     opts?.km != null ? String(opts.km) : "",
      size:   String(opts?.size ?? 20),
      page:   String(opts?.page ?? 1),
    });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given a list of Kassalapp products (same item, different stores),
 * produce a sorted cheapest→most-expensive price comparison.
 */
export function buildPriceComparison(products: KassalProduct[]): { store: string; price: number }[] {
  const entries = products
    .filter((p) => p.current_price != null && p.store?.name)
    .map((p) => ({ store: p.store!.name, price: p.current_price! }));

  // Dedupe by store (keep cheapest per store)
  const byStore = new Map<string, number>();
  for (const e of entries) {
    const existing = byStore.get(e.store);
    if (existing == null || e.price < existing) byStore.set(e.store, e.price);
  }

  return Array.from(byStore.entries())
    .map(([store, price]) => ({ store, price }))
    .sort((a, b) => a.price - b.price);
}

/** A product with price drop info, used by the deals page. */
export interface PriceDropProduct {
  id: number;
  name: string;
  brand: string | null;
  ean: string;
  image: string | null;
  store: { name: string; code: string; logo: string | null } | null;
  current_price: number;
  current_unit_price: number | null;
  previous_price: number;
  drop_percent: number; // e.g. 25 for 25% off
}

/**
 * Given bulk price history results, find products with recent price drops.
 * Returns products sorted by biggest percentage drop.
 */
export function extractPriceDrops(bulkResults: KassalBulkPriceResult[]): PriceDropProduct[] {
  const drops: PriceDropProduct[] = [];

  for (const result of bulkResults) {
    for (const product of result.products) {
      if (product.current_price == null || !product.store?.name) continue;
      if (!product.price_history?.length) continue;

      // Find the most recent previous price that differs from current
      // Price history is sorted by date, newest first (typically)
      const sortedHistory = [...product.price_history].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      // Look for a higher price in recent history (within the data window)
      let previousPrice: number | null = null;
      for (const entry of sortedHistory) {
        if (entry.price > product.current_price) {
          previousPrice = entry.price;
          break;
        }
      }

      if (previousPrice != null && previousPrice > product.current_price) {
        const dropPercent = Math.round(((previousPrice - product.current_price) / previousPrice) * 100);
        if (dropPercent >= 5) { // Only show drops of 5% or more
          drops.push({
            id: product.id,
            name: product.name,
            brand: product.brand,
            ean: product.ean,
            image: product.image,
            store: product.store,
            current_price: product.current_price,
            current_unit_price: product.current_unit_price,
            previous_price: previousPrice,
            drop_percent: dropPercent,
          });
        }
      }
    }
  }

  // Dedupe by store (keep biggest drop per store per product name)
  const byKey = new Map<string, PriceDropProduct>();
  for (const d of drops) {
    const key = `${d.name}__${d.store?.name}`;
    const existing = byKey.get(key);
    if (!existing || d.drop_percent > existing.drop_percent) {
      byKey.set(key, d);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => b.drop_percent - a.drop_percent);
}

/**
 * Filter out null-priced products, deduplicate by store (keep cheapest per store),
 * and sort by price ascending. Returns full product objects.
 */
export function processProducts(products: KassalProduct[]): KassalProduct[] {
  const priced = products.filter((p) => p.current_price != null && p.store?.name);

  // Dedupe by store — keep the cheapest product per store
  const byStore = new Map<string, KassalProduct>();
  for (const p of priced) {
    const storeName = p.store!.name;
    const existing = byStore.get(storeName);
    if (!existing || p.current_price! < existing.current_price!) {
      byStore.set(storeName, p);
    }
  }

  return Array.from(byStore.values()).sort(
    (a, b) => a.current_price! - b.current_price!,
  );
}
