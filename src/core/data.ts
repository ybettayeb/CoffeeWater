import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { CountrySchema, ProfileSchema, WaterSchema, type Country, type Profile, type Water } from "./schema.js";

const DATA_DIR = join(import.meta.dirname, "..", "..", "data");

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

export function loadWaters(dir = join(DATA_DIR, "waters")): Water[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => z.array(WaterSchema).parse(readJson(join(dir, f))));
}

export function loadProfiles(path = join(DATA_DIR, "profiles.json")): Profile[] {
  return z.array(ProfileSchema).parse(readJson(path));
}

export function loadCountries(path = join(DATA_DIR, "countries.json")): Country[] {
  return z.array(CountrySchema).parse(readJson(path));
}

export function watersForCountry(waters: Water[], country: string): Water[] {
  return waters.filter((w) => w.countries.includes(country));
}
