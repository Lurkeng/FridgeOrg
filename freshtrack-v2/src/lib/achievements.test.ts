import { describe, it, expect } from "vitest";
import { computeStreak, computeMonthlyGrade } from "./achievements";

describe("computeStreak", () => {
  it("returns 365 when the waste set is empty", () => {
    expect(computeStreak(new Set(), new Date("2026-05-03"))).toBe(365);
  });

  it("returns 0 when today is in the waste set", () => {
    expect(computeStreak(new Set(["2026-05-03"]), new Date("2026-05-03"))).toBe(0);
  });

  it("returns correct streak when waste was N days ago", () => {
    // waste 5 days ago → streak is 5 (today through yesterday×4 are clean)
    expect(computeStreak(new Set(["2026-04-28"]), new Date("2026-05-03"))).toBe(5);
  });

  it("stops at the first waste day even with gaps", () => {
    // waste on Apr 30 and Apr 25 → streak stops at Apr 30 (3 clean days: May 1–3)
    const waste = new Set(["2026-04-30", "2026-04-25"]);
    expect(computeStreak(waste, new Date("2026-05-03"))).toBe(3);
  });
});

describe("computeMonthlyGrade", () => {
  it("returns B when there is no previous month data", () => {
    expect(computeMonthlyGrade(5, 0)).toBe("B");
  });

  it("returns A for ≥50% reduction", () => {
    expect(computeMonthlyGrade(2, 10)).toBe("A"); // -80%
    expect(computeMonthlyGrade(5, 10)).toBe("A"); // -50%
  });

  it("returns B for 20–49% reduction", () => {
    expect(computeMonthlyGrade(7, 10)).toBe("B"); // -30%
    expect(computeMonthlyGrade(8, 10)).toBe("B"); // -20%
  });

  it("returns C for 0–19% reduction", () => {
    expect(computeMonthlyGrade(10, 10)).toBe("C"); // 0%
    expect(computeMonthlyGrade(9, 10)).toBe("C"); // -10%
  });

  it("returns D for 1–20% increase", () => {
    expect(computeMonthlyGrade(11, 10)).toBe("D"); // +10%
    expect(computeMonthlyGrade(12, 10)).toBe("D"); // +20%
  });

  it("returns F for >20% increase", () => {
    expect(computeMonthlyGrade(15, 10)).toBe("F"); // +50%
  });
});
