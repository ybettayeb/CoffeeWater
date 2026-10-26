import { z } from "zod";

const mgL = z.number().nonnegative();

export const CompositionSchema = z.object({
  calcium: mgL,
  magnesium: mgL,
  bicarbonate: mgL,
  sodium: mgL.optional(),
  potassium: mgL.optional(),
  sulfate: mgL.optional(),
  chloride: mgL.optional(),
  nitrate: mgL.optional(),
  silica: mgL.optional(),
  fluoride: mgL.optional(),
  /** Dry residue at 180 °C, mg/L. */
  tds: mgL.optional(),
  ph: z.number().min(0).max(14).optional(),
});

export const WaterSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  brand: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["mineral", "spring", "purified", "distilled"]),
  sparkling: z.boolean(),
  countries: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1),
  retailers: z.array(z.string()).optional(),
  composition: CompositionSchema,
  source: z.object({
    url: z.url().optional(),
    retrieved: z.iso.date().optional(),
    note: z.string().optional(),
  }),
  verified: z.boolean(),
});

const RangeSchema = z.object({
  min: z.number().optional(),
  ideal: z.number().optional(),
  max: z.number().optional(),
  weight: z.number().positive(),
});

export const METRICS = ["gh", "kh", "tds", "sodium", "chloride", "sulfate", "caMgRatio", "mgShare"] as const;
export type Metric = (typeof METRICS)[number];

export const ProfileSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.record(z.string(), z.string()),
  methods: z.array(z.enum(["filter", "espresso", "immersion", "cold-brew"])).min(1),
  description: z.string().optional(),
  targets: z.partialRecord(z.enum(METRICS), RangeSchema),
});

export const CountrySchema = z.object({
  code: z.string().regex(/^[A-Z]{2}$/),
  name: z.record(z.string(), z.string()),
  status: z.enum(["live", "beta", "planned"]),
});

const LocalizedSchema = z.record(z.string(), z.string());

export const FLAVOR_DIMENSIONS = ["acidity", "floral", "fruit", "sweetness", "body", "chocolate"] as const;
export type FlavorDimensionId = (typeof FLAVOR_DIMENSIONS)[number];

const ConfidenceSchema = z.enum(["high", "medium", "low"]);

const ShapeTermSchema = z.object({
  feature: z.enum(METRICS),
  shape: z.enum(["up", "down", "band"]),
  /** 'up'/'down': [a, b]; 'band': [a, b, c, d]. Must be ascending. */
  points: z.array(z.number()).min(2).max(4),
});

export const FlavorModelSchema = z.object({
  version: z.number().int(),
  note: z.string().optional(),
  dimensions: z.array(
    z.object({
      id: z.enum(FLAVOR_DIMENSIONS),
      label: LocalizedSchema,
      examples: LocalizedSchema,
      confidence: ConfidenceSchema,
      why: LocalizedSchema,
      terms: z.array(ShapeTermSchema.extend({ weight: z.number().positive() })).min(1),
      gates: z.array(ShapeTermSchema).optional(),
    }),
  ),
  warnings: z.array(
    z.object({
      id: z.string(),
      label: LocalizedSchema,
      why: LocalizedSchema,
      confidence: ConfidenceSchema,
      when: z.object({ feature: z.enum(METRICS), lt: z.number().optional(), gt: z.number().optional() }),
    }),
  ),
});

export const CoffeeStyleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: LocalizedSchema,
  /** How much of each flavour the coffee itself carries (0..1). Water can't add what isn't there. */
  potential: z.record(z.enum(FLAVOR_DIMENSIONS), z.number().min(0).max(1)),
});

export type FlavorModel = z.infer<typeof FlavorModelSchema>;
export type ShapeTerm = z.infer<typeof ShapeTermSchema>;
export type CoffeeStyle = z.infer<typeof CoffeeStyleSchema>;
export type Composition = z.infer<typeof CompositionSchema>;
export type Water = z.infer<typeof WaterSchema>;
export type Range = z.infer<typeof RangeSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Country = z.infer<typeof CountrySchema>;
