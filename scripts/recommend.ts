/**
 * Try the engine from the terminal before the website exists.
 *   npm run recommend -- FR filter-light [--max 3] [--distilled]
 */
import { loadProfiles, loadWaters, watersForCountry } from "../src/core/data.js";
import { bottleRecipe, optimize, toRecipe } from "../src/core/optimizer.js";

const [country = "FR", profileId = "filter-light", ...flags] = process.argv.slice(2);
const profile = loadProfiles().find((p) => p.id === profileId);
if (!profile) {
  console.error(`Unknown profile "${profileId}". Available: ${loadProfiles().map((p) => p.id).join(", ")}`);
  process.exit(1);
}
const maxIdx = flags.indexOf("--max");
const maxComponents = (maxIdx >= 0 ? Number(flags[maxIdx + 1]) : 2) as 1 | 2 | 3;

const results = optimize(watersForCountry(loadWaters(), country.toUpperCase()), profile, {
  maxComponents,
  includeDistilled: flags.includes("--distilled"),
});

console.log(`\n${profile.label.en} — ${country.toUpperCase()}\n`);
results.forEach((r, i) => {
  const mix = r.parts.map((p) => `${p.water.name} ${Math.round(p.fraction * 100)}%`).join(" + ");
  const m = r.metrics;
  const fmt = (v: number | undefined) => (v === undefined ? "?" : v.toFixed(0));
  console.log(`${i + 1}. ${mix}   (score ${r.score.toFixed(3)})`);
  console.log(`   GH ${fmt(m.gh)}  KH ${fmt(m.kh)}  TDS ${fmt(m.tds)}  Na ${fmt(m.sodium)}  Cl ${fmt(m.chloride)}`);
  console.log(`   per litre: ${toRecipe(r.parts).map((l) => `${l.ml} mL ${l.name}`).join(" + ")}`);
  if (r.parts.length > 1)
    console.log(`   bottle:    ${bottleRecipe(r.parts).map((l) => `${l.ml} mL ${l.name}`).join(" + ")}`);
});
