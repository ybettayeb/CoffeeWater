import { describe, expect, it } from "vitest";
import { blendComposition, metrics } from "./chemistry.js";
import { loadCoffeeStyles, loadFlavorModel, loadProfiles, loadWaters, watersForCountry } from "./data.js";
import { emphasisFor, evalShape, flavorReport, predictCup } from "./flavor.js";
import { optimize } from "./optimizer.js";

const model = loadFlavorModel();
const waters = loadWaters();
const byId = (id: string) => waters.find((w) => w.id === id)!;
const report = (...parts: [string, number][]) =>
  flavorReport(metrics(blendComposition(parts.map(([id, fraction]) => ({ water: byId(id), fraction })))), model);
const emphasis = (r: ReturnType<typeof report>, id: string) => r.scores.find((s) => s.id === id)!.emphasis;
const style = (id: string) => loadCoffeeStyles().find((s) => s.id === id)!;

describe("evalShape", () => {
  const m = { gh: 50 } as Parameters<typeof evalShape>[1];
  it("handles up/down/band and missing features", () => {
    expect(evalShape({ feature: "gh", shape: "up", points: [0, 100] }, m)).toBeCloseTo(0.5);
    expect(evalShape({ feature: "gh", shape: "down", points: [0, 100] }, m)).toBeCloseTo(0.5);
    expect(evalShape({ feature: "gh", shape: "band", points: [10, 40, 60, 90] }, m)).toBe(1);
    expect(evalShape({ feature: "gh", shape: "band", points: [60, 70, 80, 90] }, m)).toBe(0);
    expect(evalShape({ feature: "kh", shape: "up", points: [0, 1] }, m)).toBe(0.5);
  });
});

describe("flavorReport", () => {
  const filter = report(["montcalm", 0.92], ["vittel-grande-source", 0.08]);
  const volvic = report(["volvic", 1]);
  const evian = report(["evian", 1]);

  it("Montcalm 92 / Vittel 8 highlights florals and fruit, mutes roast", () => {
    const lvl = Object.fromEntries(filter.scores.map((s) => [s.id, s.level]));
    expect(lvl.floral).toBe("highlighted");
    expect(lvl.fruit).toBe("highlighted");
    expect(lvl.chocolate).toBe("muted");
    expect(filter.warnings).toEqual([]);
  });

  it("Volvic is more chocolate-leaning and less acidic than the filter blend", () => {
    expect(emphasis(volvic, "chocolate")).toBeGreaterThan(emphasis(filter, "chocolate"));
    expect(emphasis(volvic, "acidity")).toBeLessThan(emphasis(filter, "acidity"));
  });

  it("flags Evian on its own as flat and chalky", () => {
    expect(evian.warnings.map((w) => w.id)).toEqual(expect.arrayContaining(["flat", "chalky"]));
  });

  it("flags Montcalm on its own as thin", () => {
    expect(report(["montcalm", 1]).warnings.map((w) => w.id)).toContain("thin");
  });

  it("keeps every score in 0..1", () => {
    for (const w of waters)
      for (const s of report([w.id, 1]).scores) {
        expect(s.emphasis).toBeGreaterThanOrEqual(0);
        expect(s.emphasis).toBeLessThanOrEqual(1);
      }
  });
});

describe("predictCup", () => {
  const filter = report(["montcalm", 0.92], ["vittel-grande-source", 0.08]);

  it("puts florals first for a washed Ethiopian", () => {
    expect(predictCup(filter, style("washed-light"))[0].id).toBe("floral");
  });

  it("can't create florals a dark roast doesn't have", () => {
    const notes = predictCup(filter, style("dark-blend"));
    expect(notes.findIndex((n) => n.id === "floral")).toBeGreaterThan(2);
  });
});

describe("optimize with flavour goals", () => {
  const fr = watersForCountry(waters, "FR");
  const profile = loadProfiles().find((p) => p.id === "espresso")!;

  it("shifts the top espresso blend towards the wanted flavour", () => {
    const goal = (id: "chocolate" | "fruit") =>
      optimize(fr, profile, { emphasize: [id], flavorModel: model, emphasisWeight: 2 })[0];
    const choc = goal("chocolate");
    const fruit = goal("fruit");
    const e = (r: typeof choc, id: "chocolate" | "fruit") => emphasisFor(flavorReport(r.metrics, model), [id]);
    expect(e(choc, "chocolate")).toBeGreaterThan(e(fruit, "chocolate"));
    expect(e(fruit, "fruit")).toBeGreaterThan(e(choc, "fruit"));
  });

  it("requires the model when goals are set", () => {
    expect(() => optimize(fr, profile, { emphasize: ["floral"] })).toThrow();
  });
});
