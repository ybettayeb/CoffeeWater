import type { Composition, Metric, Water } from "./schema.js";

/** mg/L of ion → mg/L as CaCO3 (ratio of equivalent weights). */
export const AS_CACO3 = {
  calcium: 50.04 / 20.04, // 2.497
  magnesium: 50.04 / 12.15, // 4.118
  bicarbonate: 50.04 / 61.02, // 0.8202
} as const;

/** Equivalent weights (g/eq) for the ionic balance check. */
const EQ_WEIGHT = {
  calcium: 20.04,
  magnesium: 12.15,
  sodium: 22.99,
  potassium: 39.1,
  bicarbonate: 61.02,
  sulfate: 48.03,
  chloride: 35.45,
  nitrate: 62.0,
} as const;

/** General hardness, mg/L as CaCO3. */
export function gh(c: Composition): number {
  return c.calcium * AS_CACO3.calcium + c.magnesium * AS_CACO3.magnesium;
}

/** Carbonate hardness / total alkalinity, mg/L as CaCO3 (valid near neutral pH). */
export function kh(c: Composition): number {
  return c.bicarbonate * AS_CACO3.bicarbonate;
}

export type Metrics = Record<Metric, number | undefined>;

export function metrics(c: Composition): Metrics {
  const total = gh(c);
  return {
    gh: total,
    kh: kh(c),
    tds: c.tds,
    sodium: c.sodium,
    chloride: c.chloride,
    sulfate: c.sulfate,
    caMgRatio: c.magnesium > 0 ? c.calcium / c.magnesium : undefined,
    mgShare: total > 0 ? (c.magnesium * AS_CACO3.magnesium) / total : undefined,
  };
}

export interface BlendPart {
  water: Water;
  fraction: number;
}

/**
 * Linear mixing of ion concentrations. An optional field is kept only if every
 * component reports it; otherwise it is unknown, not zero.
 */
export function blendComposition(parts: BlendPart[]): Composition {
  const total = parts.reduce((s, p) => s + p.fraction, 0);
  if (Math.abs(total - 1) > 1e-6) throw new Error(`Blend fractions sum to ${total}, expected 1`);

  const keys = new Set(parts.flatMap((p) => Object.keys(p.water.composition))) as Set<keyof Composition>;
  const out: Partial<Composition> = {};
  for (const key of keys) {
    if (key === "ph") continue; // pH does not mix linearly
    let sum = 0;
    let known = true;
    for (const { water, fraction } of parts) {
      const v = water.composition[key];
      if (v === undefined) {
        known = false;
        break;
      }
      sum += v * fraction;
    }
    if (known) out[key] = sum;
  }
  return out as Composition;
}

/** Ionic balance error in %, or undefined for near-pure water. */
export function ionicBalanceError(c: Composition): number | undefined {
  const meq = (key: keyof typeof EQ_WEIGHT) => (c[key] ?? 0) / EQ_WEIGHT[key];
  const cations = meq("calcium") + meq("magnesium") + meq("sodium") + meq("potassium");
  const anions = meq("bicarbonate") + meq("sulfate") + meq("chloride") + meq("nitrate");
  if (cations + anions < 0.05) return undefined;
  return (100 * Math.abs(cations - anions)) / (cations + anions);
}
