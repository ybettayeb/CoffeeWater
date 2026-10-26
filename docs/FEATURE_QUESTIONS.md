# Open questions for you

Your answers will shape Phase 1. Defaults that are already in the draft are in **bold**.

## Audience & scope
1. Who is the main user: **home brewers**, baristas or cafés, or both?
2. Launch countries: **France only**, or France + Belgium + Switzerland + UK from day one?
3. Languages: **FR + EN**? Others?

## Recommendations
4. Brew methods to support at launch: **filter (pour-over/batch), espresso**. Also immersion
   (French press, AeroPress), cold brew, Turkish?
5. Coffee profile input: **roast level (light / medium / dark)**? Also process (washed /
   natural / anaerobic) or origin?
6. Allow **distilled / osmosis water** as a blending component? (It's in supermarkets in France as
   "eau déminéralisée", but that's often sold for irons and not food-grade.) Default: **opt-in, off**.
7. Maximum number of bottles in a blend: **2 by default, 3 as an option**?
8. Do you want to show **your own curated "editor's picks"** (like "Montcalm 92 / Vittel 8")
   next to the computed results, or computed results only?
9. Custom target sliders (GH/KH) for advanced users, at launch or later?

## Flavours
10. Are the six flavour dimensions right? (*bright acidity, florals, fruit, sweetness, body,
    chocolate/nuts/roast*.) Split fruit into citrus / red fruit / tropical? Add "spice" or "winey"?
11. How should the coffee be described: **a few style presets** (washed light, natural light,
    medium, dark blend), free-text roaster notes ("jasmine, peach"), or both?
12. How should flavours be shown: **bars**, a radar chart, a flavour wheel, or chips?
13. Do you have taste notes from your own blends (e.g. what Montcalm 92/8 brings out vs Volvic)?
    They're the best way to calibrate the model before user feedback exists.

## Data
14. Do you already have a list or spreadsheet of waters and compositions? Where do your reference
    ratios come from?
15. Should the dataset be **open** (e.g. CC-BY-SA, contributions via GitHub), or kept private?
16. Track **which shops** carry each water (Carrefour, Leclerc, Monoprix, Lidl…)? And price per litre?

## Product
17. Accounts / saved blends / taste feedback: needed, or is **no-account + shareable links** fine?
18. Monetisation: none, donations, or affiliate links?
19. Do you want a mobile app eventually, or is a **mobile-friendly website / PWA** enough?
20. Branding: a name or domain in mind? ("CoffeeWater" for now.)

## Tech
21. Any stack preference? Draft: **Astro + Preact + Tailwind, static on Cloudflare Pages**.
    Alternatives: Next.js, SvelteKit.
