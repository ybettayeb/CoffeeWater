# CoffeeWater ☕💧

Find **bottled waters you can buy at the supermarket in your country**, see their
mineral composition, and get **blends tuned for your brew method and coffee**.

> In France, for light-roast filter, *Montcalm 92 % + Vittel Grande Source 8 %* gives
> GH ≈ 71 / KH ≈ 29 mg/L as CaCO₃. For espresso, *Volvic* on its own is a solid choice.

**Status:** Phase 0. The data model, the chemistry and blend optimiser, the France seed data, tests and CI are in place.
The website comes next (see the plan).

- 📐 [Architecture](docs/ARCHITECTURE.md)
- 🗺️ [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- ❓ [Open feature questions](docs/FEATURE_QUESTIONS.md)

## Try it

```bash
npm install
npm run check                                   # typecheck + data validation + tests
npm run recommend -- FR filter-light            # top blends for light-roast filter in France
npm run recommend -- FR espresso
npm run recommend -- FR filter-medium-dark --max 3 --distilled
npm run recommend -- FR filter-light --coffee washed-light   # what ends up in your cup
npm run recommend -- FR espresso --emphasize chocolate       # optimise for a flavour goal
```

## How it works

- `data/waters/*.json` holds one record per bottled-water label (mg/L), with a source and `verified` flag.
- `data/profiles.json` holds brew targets (GH, KH, TDS, Na, Cl…) as ranges plus an ideal value, with weights.
- `src/core/` is framework-free TypeScript:
  - `chemistry.ts`: GH = 2.497·Ca + 4.118·Mg, KH = 0.8202·HCO₃⁻, linear blending, ionic balance.
  - `optimizer.ts`: searches singles, pairs (1 % steps) and triples (5 % steps), scores them against the profile,
    and prefers simpler recipes. It outputs per-litre volumes and "bottle math".
- `data/flavor-model.json` + `src/core/flavor.ts` translate chemistry into flavour tendencies (acidity, florals,
  fruit, sweetness, body, chocolate) plus warnings, each with a confidence level and a plain-language "why".
  `data/coffee-styles.json` adds the coffee's own potential, since water can't add flavours the coffee lacks.
- `scripts/validate-data.ts` checks the schema, ids, ionic balance (catches typos) and TDS plausibility.

## Contributing data

Add or fix a water in `data/waters/<country>.json`, citing the label or manufacturer sheet in `source`,
then run `npm run validate`. Set `verified: true` only if you checked it against a physical label.
