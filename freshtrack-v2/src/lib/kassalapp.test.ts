import { describe, it, expect } from "vitest";
import {
  buildPriceComparison,
  extractPriceDrops,
  processProducts,
  type KassalProduct,
  type KassalBulkPriceResult,
} from "./kassalapp";

function makeProduct(overrides: Partial<KassalProduct> = {}): KassalProduct {
  return {
    id: 1,
    name: "Test Product",
    brand: null,
    vendor: null,
    ean: "1234567890",
    description: null,
    image: null,
    current_price: 10,
    current_unit_price: null,
    store: { name: "Rema 1000", code: "rema", logo: null },
    category: [],
    allergens: [],
    nutrition: [],
    weight: null,
    weight_unit: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

describe("buildPriceComparison", () => {
  it("returns empty array for empty input", () => {
    expect(buildPriceComparison([])).toEqual([]);
  });

  it("excludes products with null price or null store", () => {
    const result = buildPriceComparison([
      makeProduct({ current_price: null }),
      makeProduct({ store: null }),
    ]);
    expect(result).toHaveLength(0);
  });

  it("deduplicates by store, keeping cheapest", () => {
    const result = buildPriceComparison([
      makeProduct({ current_price: 20, store: { name: "Rema 1000", code: "rema", logo: null } }),
      makeProduct({ current_price: 15, store: { name: "Rema 1000", code: "rema", logo: null } }),
      makeProduct({ current_price: 18, store: { name: "Kiwi", code: "kiwi", logo: null } }),
    ]);
    expect(result).toHaveLength(2);
    expect(result.find((e) => e.store === "Rema 1000")?.price).toBe(15);
  });

  it("sorts results ascending by price", () => {
    const result = buildPriceComparison([
      makeProduct({ current_price: 30, store: { name: "Meny", code: "meny", logo: null } }),
      makeProduct({ current_price: 10, store: { name: "Kiwi", code: "kiwi", logo: null } }),
      makeProduct({ current_price: 20, store: { name: "Rema 1000", code: "rema", logo: null } }),
    ]);
    expect(result.map((e) => e.price)).toEqual([10, 20, 30]);
  });
});

describe("processProducts", () => {
  it("filters out products with null price", () => {
    expect(processProducts([makeProduct({ current_price: null })])).toHaveLength(0);
  });

  it("filters out products with null store", () => {
    expect(processProducts([makeProduct({ store: null })])).toHaveLength(0);
  });

  it("deduplicates by store, keeping cheapest full product", () => {
    const cheap = makeProduct({ id: 1, current_price: 10 });
    const expensive = makeProduct({ id: 2, current_price: 20 });
    const result = processProducts([expensive, cheap]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("sorts by price ascending", () => {
    const result = processProducts([
      makeProduct({ id: 1, current_price: 30, store: { name: "Meny", code: "meny", logo: null } }),
      makeProduct({ id: 2, current_price: 10, store: { name: "Kiwi", code: "kiwi", logo: null } }),
    ]);
    expect(result[0].current_price).toBe(10);
  });
});

describe("extractPriceDrops", () => {
  function makeBulkResult(overrides: {
    current_price: number;
    history: { price: number; date: string }[];
    store?: { name: string; code: string; logo: null };
  }): KassalBulkPriceResult {
    return {
      ean: "123",
      products: [{
        id: 1,
        name: "Milk",
        brand: null,
        ean: "123",
        image: null,
        store: overrides.store ?? { name: "Rema 1000", code: "rema", logo: null },
        current_price: overrides.current_price,
        current_unit_price: null,
        price_history: overrides.history,
      }],
    };
  }

  it("returns empty for product with no price history", () => {
    const result = extractPriceDrops([makeBulkResult({ current_price: 10, history: [] })]);
    expect(result).toHaveLength(0);
  });

  it("returns empty when all history prices are lower than current (price went up)", () => {
    const result = extractPriceDrops([makeBulkResult({
      current_price: 20,
      history: [{ price: 15, date: "2026-04-01" }],
    })]);
    expect(result).toHaveLength(0);
  });

  it("detects a price drop and calculates correct drop_percent", () => {
    // previous=20, current=15 → drop = (20-15)/20 = 25%
    const result = extractPriceDrops([makeBulkResult({
      current_price: 15,
      history: [{ price: 20, date: "2026-04-01" }],
    })]);
    expect(result).toHaveLength(1);
    expect(result[0].drop_percent).toBe(25);
    expect(result[0].current_price).toBe(15);
  });

  it("ignores drops below 5%", () => {
    // previous=10.00, current=9.70 → drop ~3%
    const result = extractPriceDrops([makeBulkResult({
      current_price: 9.7,
      history: [{ price: 10, date: "2026-04-01" }],
    })]);
    expect(result).toHaveLength(0);
  });
});
