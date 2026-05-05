import { describe, it, expect } from "vitest";
import { buildFoodRows, buildPurchaseRows } from "./put-away";
import type { CheckedItem, ItemOverride } from "./put-away";

const now = new Date("2026-05-03T12:00:00.000Z");
const nowIso = now.toISOString();

const baseItem: CheckedItem = {
  id: "item-1",
  name: "Milk",
  category: "dairy",
  quantity: 2,
  unit: "l",
  notes: null,
  barcode: null,
  cheapestPrice: 29.9,
  cheapestStore: "Rema 1000",
};

describe("buildFoodRows", () => {
  it("uses defaultLocation and computes expiry when no override", () => {
    const rows = buildFoodRows([baseItem], new Map(), "fridge", now, "hh-1", "user-1");
    expect(rows).toHaveLength(1);
    expect(rows[0].location).toBe("fridge");
    expect(rows[0].expiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("uses override location over defaultLocation", () => {
    const overrides: Map<string, ItemOverride> = new Map([
      ["item-1", { id: "item-1", location: "freezer" }],
    ]);
    const rows = buildFoodRows([baseItem], overrides, "fridge", now, "hh-1", "user-1");
    expect(rows[0].location).toBe("freezer");
  });

  it("uses override expiryDate verbatim", () => {
    const overrides: Map<string, ItemOverride> = new Map([
      ["item-1", { id: "item-1", expiryDate: "2026-12-31" }],
    ]);
    const rows = buildFoodRows([baseItem], overrides, "fridge", now, "hh-1", "user-1");
    expect(rows[0].expiryDate).toBe("2026-12-31");
  });

  it("returns empty array for empty input", () => {
    expect(buildFoodRows([], new Map(), "pantry", now, "hh-1", "user-1")).toHaveLength(0);
  });
});

describe("buildPurchaseRows", () => {
  it("carries cheapestPrice and cheapestStore into price and store", () => {
    const rows = buildPurchaseRows([baseItem], new Map(), "fridge", "list-1", "hh-1", "user-1", nowIso);
    expect(rows[0].price).toBe(29.9);
    expect(rows[0].store).toBe("Rema 1000");
  });

  it("uses override location for storedLocation", () => {
    const overrides: Map<string, ItemOverride> = new Map([
      ["item-1", { id: "item-1", location: "freezer" }],
    ]);
    const rows = buildPurchaseRows([baseItem], overrides, "fridge", "list-1", "hh-1", "user-1", nowIso);
    expect(rows[0].storedLocation).toBe("freezer");
  });

  it("falls back to defaultLocation when no override", () => {
    const rows = buildPurchaseRows([baseItem], new Map(), "pantry", "list-1", "hh-1", "user-1", nowIso);
    expect(rows[0].storedLocation).toBe("pantry");
  });

  it("returns empty array for empty input", () => {
    expect(buildPurchaseRows([], new Map(), "fridge", "list-1", "hh-1", "user-1", nowIso)).toHaveLength(0);
  });
});
