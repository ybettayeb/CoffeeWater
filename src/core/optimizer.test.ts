import { describe, expect, it } from "vitest";
import { loadProfiles, loadWaters, watersForCountry } from "./data.js";
import { bottleRecipe, optimize, toRecipe } from "./optimizer.js";

const fr = watersForCountry(loadWaters(), "FR");
const profile = (id: string) => loadProfiles().find((p) => p.id === id)!;
const ids = (r: { parts: { water: { id: string } }[] }) => r.parts.map((p) => p.water.id);

describe("optimize", () => {
  it("recommends Montcalm + Vittel ≈ 92/8 for light-roast filter in France", () => {
    const [top] = optimize(fr, profile("filter-light"));
    expect(ids(top)).toEqual(["montcalm", "vittel-grande-source"]);
    expect(top.parts[0].fraction).toBeGreaterThanOrEqual(0.9);
    expect(top.parts[0].fraction).toBeLessThanOrEqual(0.94);
  });

  it("ranks Volvic alone among the best espresso options", () => {
    const results = optimize(fr, profile("espresso"));
    const volvic = results.find((r) => r.parts.length === 1 && r.parts[0].water.id === "volvic");
    expect(volvic).toBeDefined();
    expect(volvic!.metrics.kh).toBeLessThanOrEqual(70);
  });

  it("excludes distilled water unless asked", () => {
    expect(optimize(fr, profile("filter-light"), { limit: 100 }).flatMap(ids)).not.toContain("distilled");
    expect(
      optimize(fr, profile("filter-light"), { includeDistilled: true, limit: 100 }).flatMap(ids),
    ).toContain("distilled");
  });

  it("respects the minimum share", () => {
    for (const r of optimize(fr, profile("sca-standard"), { maxComponents: 3, limit: 50 }))
      for (const p of r.parts) expect(p.fraction).toBeGreaterThanOrEqual(0.03 - 1e-9);
  });

  it("returns results sorted by score", () => {
    const scores = optimize(fr, profile("filter-medium-dark"), { limit: 20 }).map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
  });
});

describe("recipes", () => {
  const [top] = optimize(fr, profile("filter-light"));

  it("gives per-litre volumes", () => {
    const lines = toRecipe(top.parts);
    expect(lines.reduce((s, l) => s + l.ml, 0)).toBeCloseTo(1000, -1);
  });

  it("gives bottle math relative to a full bottle of the main water", () => {
    const [main, minor] = bottleRecipe(top.parts, 1500);
    expect(main).toMatchObject({ waterId: "montcalm", ml: 1500 });
    expect(minor.ml).toBeGreaterThan(100);
    expect(minor.ml).toBeLessThan(170);
  });
});
