/** Validate data/: schema, unique ids, ionic balance, TDS plausibility. Exits non-zero on error. */
import { ionicBalanceError } from "../src/core/chemistry.js";
import { loadCoffeeStyles, loadCountries, loadFlavorModel, loadProfiles, loadWaters } from "../src/core/data.js";
import { FLAVOR_DIMENSIONS } from "../src/core/schema.js";

const errors: string[] = [];
const warnings: string[] = [];

const waters = loadWaters();
const profiles = loadProfiles();
const countries = loadCountries();
const countryCodes = new Set(countries.map((c) => c.code));

const seen = new Set<string>();
for (const w of waters) {
  if (seen.has(w.id)) errors.push(`duplicate water id: ${w.id}`);
  seen.add(w.id);

  for (const cc of w.countries)
    if (!countryCodes.has(cc)) warnings.push(`${w.id}: country ${cc} not in countries.json`);

  const ib = ionicBalanceError(w.composition);
  if (ib !== undefined && ib > 10) errors.push(`${w.id}: ionic balance off by ${ib.toFixed(1)}% (> 10%)`);
  else if (ib !== undefined && ib > 5) warnings.push(`${w.id}: ionic balance off by ${ib.toFixed(1)}%`);

  // Dry residue ≈ sum of ions minus ~half the bicarbonate (lost as CO2 on evaporation).
  const c = w.composition;
  if (c.tds !== undefined && c.tds > 0) {
    const ions =
      c.calcium + c.magnesium + c.bicarbonate * 0.51 +
      (c.sodium ?? 0) + (c.potassium ?? 0) + (c.sulfate ?? 0) + (c.chloride ?? 0) +
      (c.nitrate ?? 0) + (c.silica ?? 0);
    const ratio = c.tds / ions;
    if (ratio < 0.5 || ratio > 1.5) warnings.push(`${w.id}: TDS ${c.tds} vs ion estimate ${ions.toFixed(0)}`);
  }

  if (!w.source.url && w.type !== "distilled") warnings.push(`${w.id}: no source url`);
}

const profileIds = new Set<string>();
for (const p of profiles) {
  if (profileIds.has(p.id)) errors.push(`duplicate profile id: ${p.id}`);
  profileIds.add(p.id);
  for (const [metric, r] of Object.entries(p.targets)) {
    if (r.min !== undefined && r.max !== undefined && r.min > r.max) errors.push(`${p.id}.${metric}: min > max`);
    if (r.ideal !== undefined && ((r.min ?? -Infinity) > r.ideal || (r.max ?? Infinity) < r.ideal))
      errors.push(`${p.id}.${metric}: ideal outside [min, max]`);
  }
}

const model = loadFlavorModel();
const styles = loadCoffeeStyles();
const dimIds = model.dimensions.map((d) => d.id);
for (const id of FLAVOR_DIMENSIONS) if (!dimIds.includes(id)) errors.push(`flavor model: missing dimension ${id}`);
if (new Set(dimIds).size !== dimIds.length) errors.push("flavor model: duplicate dimension");
for (const d of model.dimensions)
  for (const t of [...d.terms, ...(d.gates ?? [])]) {
    const expected = t.shape === "band" ? 4 : 2;
    if (t.points.length !== expected) errors.push(`flavor ${d.id}.${t.feature}: ${t.shape} needs ${expected} points`);
    if (t.points.some((p, i) => i > 0 && p < t.points[i - 1]))
      errors.push(`flavor ${d.id}.${t.feature}: points must be ascending`);
  }
for (const s of styles)
  for (const id of FLAVOR_DIMENSIONS)
    if (s.potential[id] === undefined) errors.push(`coffee style ${s.id}: missing potential.${id}`);

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);
console.log(
  `${waters.length} waters, ${profiles.length} profiles, ${countries.length} countries, ` +
    `${model.dimensions.length} flavour dimensions, ${styles.length} coffee styles`,
);
if (errors.length) process.exit(1);
