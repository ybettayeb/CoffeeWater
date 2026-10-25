import { describe, expect, it } from "vitest";
import { blendComposition, gh, ionicBalanceError, kh } from "./chemistry.js";
import { loadWaters } from "./data.js";

const waters = loadWaters();
const byId = (id: string) => waters.find((w) => w.id === id)!;

describe("chemistry", () => {
  it("computes GH and KH as CaCO3", () => {
    const volvic = byId("volvic").composition;
    expect(gh(volvic)).toBeCloseTo(12 * 2.497 + 8 * 4.118, 1);
    expect(kh(volvic)).toBeCloseTo(74 * 0.8202, 1);
  });

  it("reproduces the reference blend Montcalm 92 / Vittel 8", () => {
    const c = blendComposition([
      { water: byId("montcalm"), fraction: 0.92 },
      { water: byId("vittel-grande-source"), fraction: 0.08 },
    ]);
    expect(gh(c)).toBeCloseTo(71.3, 0);
    expect(kh(c)).toBeCloseTo(29.1, 0);
    expect(c.ph).toBeUndefined();
  });

  it("drops fields not reported by every component", () => {
    const c = blendComposition([
      { water: byId("montcalm"), fraction: 0.5 },
      { water: byId("distilled"), fraction: 0.5 },
    ]);
    expect(c.silica).toBeUndefined();
    expect(c.calcium).toBeCloseTo(1.5);
  });

  it("rejects fractions that don't sum to 1", () => {
    expect(() => blendComposition([{ water: byId("volvic"), fraction: 0.9 }])).toThrow();
  });

  it("finds seed data ionically balanced", () => {
    for (const w of waters) {
      const err = ionicBalanceError(w.composition);
      if (err !== undefined) expect(err, w.id).toBeLessThan(10);
    }
  });
});
