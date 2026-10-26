/**
 * Try the engine from the terminal before the website exists.
 *   npm run recommend -- FR filter-light [--max 3] [--distilled]
 *       [--emphasize floral,fruit] [--coffee washed-light]
 */
import { loadCoffeeStyles, loadFlavorModel, loadProfiles, loadWaters, watersForCountry } from "../src/core/data.js";
import { flavorReport, predictCup } from "../src/core/flavor.js";
import { bottleRecipe, optimize, toRecipe } from "../src/core/optimizer.js";
import { FLAVOR_DIMENSIONS, type FlavorDimensionId } from "../src/core/schema.js";

const [country = "FR", profileId = "filter-light", ...flags] = process.argv.slice(2);
const flag = (name: string) => {
  const i = flags.indexOf(name);
  return i >= 0 ? flags[i + 1] : undefined;
};

const profile = loadProfiles().find((p) => p.id === profileId);
if (!profile) {
  console.error(`Unknown profile "${profileId}". Available: ${loadProfiles().map((p) => p.id).join(", ")}`);
  process.exit(1);
}
const model = loadFlavorModel();
const emphasize = (flag("--emphasize")?.split(",") ?? []) as FlavorDimensionId[];
for (const id of emphasize)
  if (!FLAVOR_DIMENSIONS.includes(id)) {
    console.error(`Unknown flavour "${id}". Available: ${FLAVOR_DIMENSIONS.join(", ")}`);
    process.exit(1);
  }
const coffeeId = flag("--coffee");
const coffee = coffeeId ? loadCoffeeStyles().find((s) => s.id === coffeeId) : undefined;
if (coffeeId && !coffee) {
  console.error(`Unknown coffee "${coffeeId}". Available: ${loadCoffeeStyles().map((s) => s.id).join(", ")}`);
  process.exit(1);
}

const results = optimize(watersForCountry(loadWaters(), country.toUpperCase()), profile, {
  maxComponents: Number(flag("--max") ?? 2) as 1 | 2 | 3,
  includeDistilled: flags.includes("--distilled"),
  emphasize,
  flavorModel: model,
});

const dimLabel = (id: string) => model.dimensions.find((d) => d.id === id)!.label.en;
const warnLabel = (id: string) => model.warnings.find((w) => w.id === id)!.label.en;
const bar = (x: number) => "█".repeat(Math.round(x * 10)).padEnd(10, "·");

const goal = emphasize.length ? `, emphasising ${emphasize.join(" + ")}` : "";
console.log(`\n${profile.label.en} — ${country.toUpperCase()}${goal}${coffee ? ` — ${coffee.label.en}` : ""}\n`);
results.forEach((r, i) => {
  const mix = r.parts.map((p) => `${p.water.name} ${Math.round(p.fraction * 100)}%`).join(" + ");
  const m = r.metrics;
  const fmt = (v: number | undefined) => (v === undefined ? "?" : v.toFixed(0));
  console.log(`${i + 1}. ${mix}   (score ${r.score.toFixed(3)})`);
  console.log(`   GH ${fmt(m.gh)}  KH ${fmt(m.kh)}  TDS ${fmt(m.tds)}  Na ${fmt(m.sodium)}  Cl ${fmt(m.chloride)}`);
  console.log(`   per litre: ${toRecipe(r.parts).map((l) => `${l.ml} mL ${l.name}`).join(" + ")}`);
  if (r.parts.length > 1)
    console.log(`   bottle:    ${bottleRecipe(r.parts).map((l) => `${l.ml} mL ${l.name}`).join(" + ")}`);

  const report = flavorReport(m, model);
  const rows = coffee
    ? predictCup(report, coffee).map((n) => ({ id: n.id, value: n.prominence, tag: "" }))
    : report.scores.map((s) => ({ id: s.id, value: s.emphasis, tag: s.level }));
  console.log(coffee ? "   in your cup:" : "   water tends to:");
  for (const row of rows) console.log(`     ${bar(row.value)} ${dimLabel(row.id)}${row.tag ? ` (${row.tag})` : ""}`);
  if (report.warnings.length) console.log(`   ⚠ ${report.warnings.map((w) => warnLabel(w.id)).join(", ")}`);
  console.log();
});
