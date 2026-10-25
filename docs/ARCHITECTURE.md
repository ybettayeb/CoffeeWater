# CoffeeWater — Architecture (draft v0.1)

> Goal: a visitor picks a **country**, a **brew method** and a **coffee profile**, and gets
> **bottled waters they can buy at the grocery store there**, with their mineral
> composition, plus the **best blends** of them (e.g. *Montcalm 92 % + Vittel 8 %* for
> light-roast filter in France, *Volvic straight* for espresso).

---

## 1. Guiding principles

1. **The data is the product.** Mineral compositions and availability per country are
   the valuable, hard-to-get part. Keep them in plain, versioned files in the repo,
   validated in CI, each value carrying its **source** and **verification date**.
   Contributions come in as pull requests.
2. **The math is cheap, so run it in the browser.** Blending is linear in the ion
   concentrations. Brute-forcing every pair (and triple) of the ~10–40 waters in one
   country takes milliseconds client-side. **No backend is needed for the MVP.**
3. **Static first, SEO-friendly.** People search for things like "meilleure eau pour café
   filtre" or "best bottled water for espresso UK". Pre-render one page per
   country, per water and per country × method, and add interactivity as islands.
4. **The core is independent of any framework.** The chemistry and optimiser live in a
   pure TypeScript module (`src/core`) with unit tests. The website, a future mobile app
   or an API can all use it.

---

## 2. High-level view

```
                    ┌──────────────────────────────────────────────┐
                    │                  Git repo                    │
                    │                                              │
  contributors ───▶ │  data/                                       │
  (PRs, forms)      │   ├─ waters/<country>.json  ◀── zod schema ──┼── CI: validate,
                    │   ├─ profiles.json (brew targets)            │       unit tests
                    │   └─ countries.json                          │
                    │                                              │
                    │  src/core/   (pure TS: chemistry, optimiser) │
                    │  src/web/    (Astro site, islands)  [phase 1]│
                    └───────────────┬──────────────────────────────┘
                                    │ build (static)
                                    ▼
                   ┌────────────────────────────────┐
                   │  Static hosting / CDN          │  Cloudflare Pages, Vercel
                   │  /fr/, /fr/eaux/volvic,        │  or GitHub Pages
                   │  /fr/espresso, /en/...         │
                   └───────────────┬────────────────┘
                                   │
                                   ▼
                   ┌────────────────────────────────┐
                   │ Browser                        │
                   │  - country / method / profile  │
                   │  - optimiser runs locally      │
                   │  - "my waters" in localStorage │
                   └────────────────────────────────┘

  Phase 3+ (optional): a small API + DB (Supabase/Postgres) for user submissions,
  ratings, label photo OCR, accounts. Static pages stay the default read path.
```

---

## 3. Domain model

### 3.1 Water (one bottled product)

| field | unit | notes |
|---|---|---|
| `id` | slug | `volvic`, `vittel-grande-source` |
| `brand`, `name` | text | |
| `type` | enum | `mineral` (eau minérale naturelle), `spring` (eau de source), `purified`, `distilled` |
| `countries[]` | ISO 3166-1 | where it's commonly sold. A water can appear in several (Volvic: FR, UK, BE…) |
| `retailers[]` | text | optional: Carrefour, Monoprix, Tesco… |
| `sparkling` | bool | excluded from blends by default |
| `composition` | mg/L | `calcium`, `magnesium`, `sodium`, `potassium`, `bicarbonate`, `sulfate`, `chloride`, `nitrate`, `silica`, `fluoride`, `tds` (dry residue at 180 °C), `ph` |
| `source` | url + date | label photo, manufacturer sheet, retailer page |
| `verified` | bool | someone checked it against a physical label |

> **Note:** labels for the same brand differ by source/country (Vittel *Grande Source*
> vs older Vittel figures, Cristaline is "sources variables"). One record per
> **label composition**, not per brand.

### 3.2 Derived metrics (computed, never stored)

| metric | formula | why it matters |
|---|---|---|
| **GH**, general hardness (as CaCO₃) | `2.497·Ca + 4.118·Mg` | how well the water extracts flavour |
| **KH**, alkalinity (as CaCO₃) | `0.8202·HCO₃⁻` | acid buffering: high KH tastes flat and chalky, low KH tastes bright or sour |
| **Ca:Mg ratio** | `Ca/Mg` (molar or mass) | Mg is often said to emphasise fruit/acidity, Ca body |
| **TDS** | dry residue (or sum of ions) | overall mineral content |
| **Na, Cl⁻, SO₄²⁻** | raw | taste (salty, bitter) and **corrosion/scale risk in espresso machines** |
| **LSI / scale risk** | simplified Langelier index | espresso machine warning |

### 3.3 Brew target profile

A target is a set of **ranges plus an ideal point** on GH, KH, TDS, Na, Cl… with
weights. Profiles are data (`data/profiles.json`), so they can be tuned without code changes.
Initial set:

- `filter-light`: light roast, V60/Chemex/batch brew. Moderate GH, low KH.
- `filter-medium-dark`: medium/dark roast filter. Close to the SCA standard (KH ≈ 40).
- `espresso`: GH kept moderate to limit scale, KH ≈ 30–65 to buffer, low Cl⁻ (corrosion).
- `sca-standard`: the SCA Water Quality Handbook targets, as a reference.

Later: profiles by **origin and process** (washed Ethiopian vs natural Brazil), immersion, cold brew,
and user-defined targets (sliders).

### 3.4 Blend

`Blend = [(waterId, fraction)]` with Σ fractions = 1. Each ion's concentration is
`Σ fᵢ·cᵢ`, which is linear. The output shows the ratio, the per-litre volumes ("920 mL Montcalm +
80 mL Vittel"), and "bottle math" (e.g. *one 1.5 L Montcalm + 130 mL Vittel*).

---

## 4. Optimiser

Input: a candidate set (waters available in the country, minus sparkling and anything the user
excluded, plus **distilled/RO water** if the user allows it), and a target profile.

1. **Singles:** score every water on its own.
2. **Pairs:** for every pair (A, B), sweep the fraction of A over 0–100 % in 1 % steps (or solve the
   1-D weighted least squares in closed form) and keep the best ratio.
3. **Triples** (optional toggle): coarse 5 % grid, then refine around the best point.
4. **Score** = Σ wₖ · ((valueₖ − idealₖ) / scaleₖ)² + hard-ish penalties outside the
   ranges, plus extra penalties (e.g. Cl⁻ > 30 mg/L for espresso).
5. Apply **practicality** rules. Prefer blends that use fewer waters, round ratios
   (to 5 % or 1 %), and a minor component of at least ~3 % (hard to measure below that). Show the
   top N, de-duplicated.

Complexity: 40 waters → 780 pairs × 101 steps ≈ 80 k evaluations, which takes under 5 ms in JS.
Triples: 9,880 × ~231 grid points ≈ 2.3 M, which takes tens of ms. That is fine, and can move to a Web Worker.

---

## 5. Front end (phase 1)

- **Astro** (static, content collections, i18n routing) with **Preact/React islands**
  for the interactive finder. **Tailwind** for styling.
  - Why Astro: mostly static content, great SEO and Lighthouse scores, easy i18n,
    data files used directly at build time, islands only where needed.
  - Alternative: Next.js static export if you prefer React-everywhere or plan to add
    server features sooner.
- Pages:
  - `/` chooses the country (auto-suggested from `Accept-Language` or geolocation, never forced)
  - `/{country}/` lists the waters with a sortable composition table and a GH/KH scatter plot
  - `/{country}/{method}/` shows recommended blends (pre-rendered for SEO, recalculated live)
  - `/{country}/waters/{id}` is the water detail page: label values, source, "pairs well with"
  - `/learn/` explains the chemistry (GH, KH, why Mg, why not tap water…)
  - `/calculator` is the "I have these bottles at home" mode: tick waters and get the best mix
- State: URL query params (so a blend is shareable) and `localStorage` for "my waters".
- i18n: FR + EN at launch, then DE/IT/ES/NL as countries are added.

---

## 6. Data pipeline & quality

- `data/waters/<cc>.json` holds an array of water records. `cc` is the **primary market**.
  The record's `countries[]` lists every market where it's sold.
- `npm run validate` does the following:
  - schema validation (zod)
  - unique ids
  - **ionic balance check**: Σ cations (meq/L) ≈ Σ anions (meq/L) within ~10 %. This catches
    typos (mg vs µg, misplaced decimals) automatically.
  - plausibility (TDS ≥ sum of major ions × ~0.8, pH 4–10)
- Sources: bottle labels (legally required in the EU for *eaux minérales naturelles*),
  manufacturer sheets, retailer pages, Open Food Facts. Store the URL and date for every record.
- Later: a contribution form ("snap the label") opens a GitHub issue or PR via a bot, with
  OCR prefill.

---

## 7. Hosting, ops, cost

- Static build on **Cloudflare Pages** or **Vercel**, free tier, with preview deploys per PR.
- Analytics: Plausible or Umami (privacy-friendly, no cookie banner).
- Monetisation (optional, later): affiliate links to online grocers. Keep it clearly
  labelled, and never let it affect ranking.

---

## 8. Repo layout

```
.
├── data/
│   ├── countries.json
│   ├── profiles.json          brew targets
│   └── waters/
│       └── fr.json            seed: France
├── docs/
│   ├── ARCHITECTURE.md        (this file)
│   ├── IMPLEMENTATION_PLAN.md
│   └── FEATURE_QUESTIONS.md
├── scripts/
│   └── validate-data.ts
├── src/
│   ├── core/                  framework-free domain logic (+ tests)
│   │   ├── schema.ts
│   │   ├── chemistry.ts
│   │   ├── optimizer.ts
│   │   └── *.test.ts
│   └── web/                   Astro app (phase 1)
└── .github/workflows/ci.yml
```
