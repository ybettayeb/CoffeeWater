# CoffeeWater — Implementation plan (draft v0.1)

Each phase ends with something shippable. Time estimates assume one developer working part-time.

## Phase 0 — Foundations ✅ (this commit)

- [x] Repo, docs (architecture, plan, feature questions)
- [x] Data schema (zod) and France seed data with sources
- [x] Core chemistry: GH, KH, Ca:Mg, blend composition
- [x] Optimiser: singles, pairs and triples with practicality rules
- [x] Brew target profiles (filter-light, filter-medium-dark, espresso, SCA)
- [x] Data validator with an ionic-balance check
- [x] Unit tests, including the reference case *Montcalm 92 / Vittel 8 → GH ≈ 71, KH ≈ 29*
- [x] CI (GitHub Actions): typecheck, tests, data validation
- [x] **Flavour model v1**: six flavour dimensions + warnings with confidence levels, coffee styles,
      "in your cup" prediction, flavour goals in the optimiser (`--emphasize floral,fruit`)

## Phase 1 — MVP website: France (≈ 2–3 weeks)

1. Scaffold **Astro + Tailwind + Preact** in `src/web`, using `src/core` and `data/`.
2. **Country picker** home page (FR only at first; other countries shown as "coming soon").
3. **Finder island**: choose a method and profile, then see the top 5 blends. Each card shows the ratio, the
   per-litre volumes, the resulting GH/KH/TDS/Na/Cl, the deviation from target, and the "why" in plain words.
4. **Flavour UI**: flavour bars/radar and chips on every result, a coffee-style picker, the
   "I want…" flavour goal chips, and tooltips with the why and the confidence.
5. **Waters table** for the country: sortable, with filters (still only, available at …), and a GH vs
   KH scatter plot with the target zone shaded.
6. **Water detail pages** (static) for SEO.
7. **"I have these bottles"** calculator mode.
8. Shareable URLs, FR/EN i18n, mobile-first layout.
9. Deploy to Cloudflare Pages with PR previews.
10. **Data**: grow France to about 25–30 still waters, verified against labels: Montcalm,
    Mont Roucous, Rosée de la Reine, Volvic, Evian, Vittel, Contrex, Hépar, Courmayeur, Thonon,
    Wattwiller, Cristaline (by source), store brands…

## Phase 2 — More countries & content (≈ 3–4 weeks)

- Add BE, CH, UK, DE, ES, IT, NL (the waters overlap a lot, so the multi-country model pays off).
- `/learn` articles (GH/KH, magnesium vs calcium, why not tap/Brita, espresso scale).
- Profile refinement: roast level and processing slider, origin presets.
- Coffee input from the roaster's tasting notes ("jasmine, peach, honey"), mapped to flavour potentials.
- Custom target mode: sliders for GH/KH, or import a recipe (e.g. Rao, Hendon, "Barista Hustle").
- Recipe export: "mix 1.5 L A + 130 mL B", printable/QR card.
- Espresso machine safety warnings (chloride, LSI/scale).

## Phase 3 — Community (≈ 4+ weeks, only if there is demand)

- "Submit a water" form with label photo → GitHub issue/PR (via a bot), with OCR prefill.
- Taste feedback ("I brewed this: florals 4/5, acidity 2/5…") to **calibrate the flavour model**
  (fit the term weights per dimension) and improve recommendations. This needs a backend
  (Supabase/Postgres), auth (magic link) and moderation.
- Store availability by retailer, perhaps crowd-sourced.
- Optional DIY mode: concentrates made from Epsom salt, baking soda and CaCl₂ (Third Wave Water-style),
  shown alongside the bottled blends.

## Phase 4 — Nice-to-haves

- PWA/offline, "my pantry" synced across devices.
- Price per litre and a cheapest-good-blend option.
- Affiliate links (clearly labelled).
- A public JSON API of the dataset (CC-BY-SA?).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Wrong or outdated label data | source + date per record, `verified` flag, ionic balance check in CI, "report an error" link |
| Flavour predictions over-promise | show tendencies, not promises; a confidence badge plus a "why" on every claim; calibrate with feedback |
| Taste is subjective, so targets get disputed | profiles are data, cite sources, let users tune targets, present results as "starting points" |
| Regional availability is fuzzy | start with national supermarket chains, crowd-source later |
| Scope creep (accounts, social…) | stay static until Phase 3 has proven demand |
