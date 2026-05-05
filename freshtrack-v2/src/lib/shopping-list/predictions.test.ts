import { describe, it, expect } from "vitest";
import { mergePatterns, computePredictions } from "./predictions";

describe("mergePatterns", () => {
  it("carries through food-only entries unchanged", () => {
    const result = mergePatterns(
      [{ name: "milk", category: "dairy", count: 3, minDate: "2026-01-01", maxDate: "2026-03-01" }],
      [],
    );
    expect(result.get("milk")).toMatchObject({ count: 3 });
  });

  it("carries through waste-only entries", () => {
    const result = mergePatterns([], [
      { name: "yoghurt", category: "dairy", count: 2, minDate: "2026-02-01", maxDate: "2026-04-01" },
    ]);
    expect(result.get("yoghurt")).toMatchObject({ count: 2 });
  });

  it("merges same-name entries: sums counts and widens date range", () => {
    const result = mergePatterns(
      [{ name: "eggs", category: "dairy", count: 3, minDate: "2026-02-01", maxDate: "2026-04-01" }],
      [{ name: "eggs", category: "dairy", count: 2, minDate: "2026-01-01", maxDate: "2026-03-15" }],
    );
    const merged = result.get("eggs")!;
    expect(merged.count).toBe(5);
    expect(merged.minDate).toBe("2026-01-01");
    expect(merged.maxDate).toBe("2026-04-01");
  });
});

describe("computePredictions", () => {
  it("skips patterns with count < 2", () => {
    const map = mergePatterns(
      [{ name: "butter", category: "dairy", count: 1, minDate: "2026-04-01", maxDate: "2026-04-01" }],
      [],
    );
    expect(computePredictions(map, new Date("2026-05-03"))).toHaveLength(0);
  });

  it("skips patterns with zero date range", () => {
    const map = mergePatterns(
      [{ name: "cream", category: "dairy", count: 3, minDate: "2026-04-15", maxDate: "2026-04-15" }],
      [],
    );
    expect(computePredictions(map, new Date("2026-05-03"))).toHaveLength(0);
  });

  it("skips predictions where daysUntilNeeded > 3", () => {
    // min=Jan 1, max=Feb 1 → interval=31 days, today=Feb 5 → daysSinceLast=4, daysUntilNeeded=27
    const map = mergePatterns(
      [{ name: "cheese", category: "dairy", count: 2, minDate: "2026-01-01", maxDate: "2026-02-01" }],
      [],
    );
    expect(computePredictions(map, new Date("2026-02-05"))).toHaveLength(0);
  });

  it("includes predictions where daysUntilNeeded ≤ 3 with correct values", () => {
    // min=Apr 1, max=Apr 15, count=3 → interval = 14/2 = 7 days
    // today=Apr 22 → daysSinceLast=7, daysUntilNeeded=round(7-7)=0
    const map = mergePatterns(
      [{ name: "milk", category: "dairy", count: 3, minDate: "2026-04-01", maxDate: "2026-04-15" }],
      [],
    );
    const results = computePredictions(map, new Date("2026-04-22"));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      name: "milk",
      averageIntervalDays: 7,
      daysUntilNeeded: 0,
    });
  });

  it("returns results sorted ascending by daysUntilNeeded", () => {
    // eggs: min=Apr 1, max=Apr 8, count=2 → interval=7, daysSinceLast=9 → daysUntilNeeded=-2
    // bread: min=Mar 21, max=Apr 4, count=2 → interval=14, daysSinceLast=13 → daysUntilNeeded=1
    const map = mergePatterns(
      [
        { name: "eggs", category: "dairy", count: 2, minDate: "2026-04-01", maxDate: "2026-04-08" },
        { name: "bread", category: "grains", count: 2, minDate: "2026-03-21", maxDate: "2026-04-04" },
      ],
      [],
    );
    const results = computePredictions(map, new Date("2026-04-17"));
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe("eggs");
    expect(results[1].name).toBe("bread");
  });
});
