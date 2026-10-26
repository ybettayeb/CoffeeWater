import { blendComposition, metrics, type BlendPart, type Metrics } from "./chemistry.js";
import { emphasisFor, flavorReport } from "./flavor.js";
import type { FlavorDimensionId, FlavorModel, Profile, Range, Water } from "./schema.js";

export interface OptimizeOptions {
  /** Max number of waters in a blend (1–3). */
  maxComponents?: 1 | 2 | 3;
  /** Ratio granularity for pairs, in %. */
  pairStep?: number;
  /** Ratio granularity for triples, in %. */
  tripleStep?: number;
  /** Smallest share a component may have, in % (tiny volumes are hard to measure). */
  minShare?: number;
  /** Score added per extra water, to prefer simpler recipes. */
  complexityPenalty?: number;
  /**
   * Flavour goals, e.g. ["floral", "fruit"]. Each blend's score gets
   * `emphasisWeight × (1 − mean emphasis)` added, so the profile's ranges still apply.
   */
  emphasize?: FlavorDimensionId[];
  emphasisWeight?: number;
  flavorModel?: FlavorModel;
  includeSparkling?: boolean;
  includeDistilled?: boolean;
  limit?: number;
}

export interface BlendResult {
  parts: BlendPart[];
  metrics: Metrics;
  score: number;
}

type Resolved = Required<Omit<OptimizeOptions, "flavorModel">> & Pick<OptimizeOptions, "flavorModel">;

const DEFAULTS: Resolved = {
  maxComponents: 2,
  pairStep: 1,
  tripleStep: 5,
  minShare: 3,
  complexityPenalty: 0.05,
  emphasize: [],
  emphasisWeight: 1,
  includeSparkling: false,
  includeDistilled: false,
  limit: 5,
};

const OUT_OF_RANGE_FACTOR = 10;

function scoreMetric(value: number, r: Range): number {
  let s = 0;
  if (r.ideal !== undefined) {
    const span = value >= r.ideal ? (r.max ?? r.ideal * 2) - r.ideal : r.ideal - (r.min ?? 0);
    if (span > 0) s += ((value - r.ideal) / span) ** 2;
  }
  if (r.max !== undefined && value > r.max) {
    s += OUT_OF_RANGE_FACTOR * ((value - r.max) / Math.max(r.max, 1)) ** 2;
  }
  if (r.min !== undefined && value < r.min) {
    s += OUT_OF_RANGE_FACTOR * ((r.min - value) / Math.max(r.min, 1)) ** 2;
  }
  return r.weight * s;
}

/** Lower is better. Metrics the blend can't compute (missing data) are skipped. */
export function score(m: Metrics, profile: Profile): number {
  let s = 0;
  for (const [key, range] of Object.entries(profile.targets) as [keyof Metrics, Range][]) {
    const v = m[key];
    if (v !== undefined) s += scoreMetric(v, range);
  }
  return s;
}

function evaluate(parts: BlendPart[], profile: Profile, o: Resolved): BlendResult {
  const m = metrics(blendComposition(parts));
  let s = score(m, profile) + o.complexityPenalty * (parts.length - 1);
  if (o.emphasize.length) s += o.emphasisWeight * (1 - emphasisFor(flavorReport(m, o.flavorModel!), o.emphasize));
  return { parts, metrics: m, score: s };
}

export function candidates(waters: Water[], opts: OptimizeOptions = {}): Water[] {
  const o = { ...DEFAULTS, ...opts };
  return waters.filter(
    (w) => (o.includeSparkling || !w.sparkling) && (o.includeDistilled || w.type !== "distilled"),
  );
}

/** Find the best single waters, pairs and (optionally) triples for a profile. */
export function optimize(waters: Water[], profile: Profile, opts: OptimizeOptions = {}): BlendResult[] {
  const o = { ...DEFAULTS, ...opts };
  if (o.emphasize.length && !o.flavorModel) throw new Error("`emphasize` requires `flavorModel`");
  const pool = candidates(waters, o);
  const best: BlendResult[] = [];

  for (const w of pool) best.push(evaluate([{ water: w, fraction: 1 }], profile, o));

  if (o.maxComponents >= 2) {
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        let top: BlendResult | undefined;
        for (let p = o.minShare; p <= 100 - o.minShare; p += o.pairStep) {
          const r = evaluate(
            [
              { water: pool[i], fraction: p / 100 },
              { water: pool[j], fraction: 1 - p / 100 },
            ],
            profile,
            o,
          );
          if (!top || r.score < top.score) top = r;
        }
        if (top) best.push(top);
      }
    }
  }

  if (o.maxComponents >= 3) {
    const step = o.tripleStep;
    const start = Math.ceil(o.minShare / step) * step;
    for (let i = 0; i < pool.length; i++)
      for (let j = i + 1; j < pool.length; j++)
        for (let k = j + 1; k < pool.length; k++) {
          let top: BlendResult | undefined;
          for (let a = start; a <= 100 - 2 * start; a += step)
            for (let b = start; a + b <= 100 - start; b += step) {
              const r = evaluate(
                [
                  { water: pool[i], fraction: a / 100 },
                  { water: pool[j], fraction: b / 100 },
                  { water: pool[k], fraction: (100 - a - b) / 100 },
                ],
                profile,
                o,
              );
              if (!top || r.score < top.score) top = r;
            }
          if (top) best.push(top);
        }
  }

  return best
    .map((r) => ({ ...r, parts: [...r.parts].sort((x, y) => y.fraction - x.fraction) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, o.limit);
}

export interface RecipeLine {
  waterId: string;
  name: string;
  ml: number;
}

/** Turn a blend into volumes for a total batch size (default 1 L), rounded to `roundMl`. */
export function toRecipe(parts: BlendPart[], totalMl = 1000, roundMl = 5): RecipeLine[] {
  return parts.map(({ water, fraction }) => ({
    waterId: water.id,
    name: water.name,
    ml: Math.round((fraction * totalMl) / roundMl) * roundMl,
  }));
}

/**
 * "Bottle math": keep one full bottle of the main water and say how much of each
 * other water to add, e.g. 1.5 L Montcalm + 130 mL Vittel.
 */
export function bottleRecipe(parts: BlendPart[], bottleMl = 1500, roundMl = 5): RecipeLine[] {
  const [main, ...rest] = [...parts].sort((a, b) => b.fraction - a.fraction);
  return [
    { waterId: main.water.id, name: main.water.name, ml: bottleMl },
    ...rest.map(({ water, fraction }) => ({
      waterId: water.id,
      name: water.name,
      ml: Math.round((bottleMl * fraction) / main.fraction / roundMl) * roundMl,
    })),
  ];
}
