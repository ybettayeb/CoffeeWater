import type { Metrics } from "./chemistry.js";
import type { CoffeeStyle, FlavorDimensionId, FlavorModel, ShapeTerm } from "./schema.js";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const rampUp = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));

/** Evaluate one shape term (0..1). A missing feature counts as neutral (0.5). */
export function evalShape(t: ShapeTerm, m: Metrics): number {
  const x = m[t.feature];
  if (x === undefined) return 0.5;
  const [a, b, c, d] = t.points;
  switch (t.shape) {
    case "up":
      return rampUp(x, a, b);
    case "down":
      return 1 - rampUp(x, a, b);
    case "band":
      return Math.min(rampUp(x, a, b), 1 - rampUp(x, c, d));
  }
}

export type EmphasisLevel = "highlighted" | "present" | "muted";

export interface FlavorScore {
  id: FlavorDimensionId;
  /** How strongly this water tends to bring the dimension forward (0..1). */
  emphasis: number;
  level: EmphasisLevel;
  confidence: "high" | "medium" | "low";
}

export interface FlavorWarning {
  id: string;
  confidence: "high" | "medium" | "low";
}

export interface FlavorReport {
  scores: FlavorScore[];
  warnings: FlavorWarning[];
}

export const level = (e: number): EmphasisLevel => (e >= 0.65 ? "highlighted" : e >= 0.4 ? "present" : "muted");

/** What a water (or blend) tends to emphasise, independent of the coffee. */
export function flavorReport(m: Metrics, model: FlavorModel): FlavorReport {
  const scores = model.dimensions.map((d) => {
    const total = d.terms.reduce((s, t) => s + t.weight, 0);
    let e = d.terms.reduce((s, t) => s + t.weight * evalShape(t, m), 0) / total;
    for (const g of d.gates ?? []) e *= evalShape(g, m);
    return { id: d.id, emphasis: e, level: level(e), confidence: d.confidence };
  });
  const warnings = model.warnings
    .filter(({ when }) => {
      const x = m[when.feature];
      return x !== undefined && ((when.lt !== undefined && x < when.lt) || (when.gt !== undefined && x > when.gt));
    })
    .map((w) => ({ id: w.id, confidence: w.confidence }));
  return { scores, warnings };
}

export interface CupNote {
  id: FlavorDimensionId;
  /** Expected prominence in the cup: the coffee's potential × the water's emphasis (0..1). */
  prominence: number;
}

/**
 * Combine water emphasis with the coffee's own flavour potential, strongest first.
 * Water can't create florals a coffee doesn't have, so a dark Brazil stays chocolatey.
 */
export function predictCup(report: FlavorReport, coffee: CoffeeStyle): CupNote[] {
  return report.scores
    .map((s) => ({ id: s.id, prominence: (coffee.potential[s.id] ?? 0) * s.emphasis }))
    .sort((a, b) => b.prominence - a.prominence);
}

/** Mean emphasis over the wanted dimensions (0..1). Used by the optimiser for flavour goals. */
export function emphasisFor(report: FlavorReport, wanted: FlavorDimensionId[]): number {
  if (!wanted.length) return 0;
  const byId = new Map(report.scores.map((s) => [s.id, s.emphasis]));
  return wanted.reduce((s, id) => s + (byId.get(id) ?? 0), 0) / wanted.length;
}
