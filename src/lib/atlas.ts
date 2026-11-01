"use client";

/**
 * Derived statistics, achievement levels and shared country helpers.
 */

import { COUNTRIES_META, type CountryMeta } from "@/data/countries-meta";
import type { CountryEntry } from "@/lib/store";

export { COUNTRIES_META };
export type { CountryMeta };

export const BY_ID: Record<string, CountryMeta> = Object.fromEntries(
  COUNTRIES_META.map((m) => [m.id, m])
);

export const CONTINENT_ORDER = [
  "Europe",
  "Asia",
  "Africa",
  "North America",
  "South America",
  "Oceania",
  "Antarctica",
] as const;

export const CONTINENT_COLORS: Record<string, string> = {
  Europe: "#fde047",
  Asia: "#facc15",
  Africa: "#fbbf24",
  "North America": "#f59e0b",
  "South America": "#eab308",
  Oceania: "#d97706",
  Antarctica: "#a16207",
};

/* ------------------------------------------------------------------ */
/* Flags                                                               */
/* ------------------------------------------------------------------ */

export function flagUrl(iso2: string | null, w = 40): string | null {
  if (!iso2) return null;
  return `https://flagcdn.com/w${w}/${iso2.toLowerCase()}.png`;
}

export function flagEmoji(iso2: string | null): string {
  if (!iso2 || iso2.length !== 2) return "🌐";
  return String.fromCodePoint(
    ...[...iso2.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

/* ------------------------------------------------------------------ */
/* Statistics                                                          */
/* ------------------------------------------------------------------ */

export interface ContinentStat {
  name: string;
  color: string;
  visited: number;
  countries: number; // UN members (incl. observers) in dataset
  territories: number;
  total: number;
  visitedTerritories: number;
}

export interface AtlasStats {
  visitedIds: string[];
  wishlistIds: string[];
  visitedCountries: number;
  visitedTerritories: number;
  worldCountries: number;
  worldTotal: number;
  pctWorld: number; // 0..1 of worldCountries
  landKm2: number;
  landPct: number; // 0..1
  popReach: number;
  popPct: number; // 0..1
  continents: ContinentStat[];
  yearGroups: { year: number; ids: string[] }[];
  undatedIds: string[];
  earliestYear: number | null;
  ratingAvg: number;
  recentIds: string[];
}

const worldLand = COUNTRIES_META.reduce((s, m) => s + m.area, 0);
const worldPop = COUNTRIES_META.reduce((s, m) => s + m.pop, 0);
const worldCountries = COUNTRIES_META.filter((m) => m.un).length;

export function computeStats(entries: Record<string, CountryEntry>): AtlasStats {
  const visitedIds: string[] = [];
  const wishlistIds: string[] = [];
  let visitedCountries = 0;
  let visitedTerritories = 0;
  let landKm2 = 0;
  let popReach = 0;
  const continentAgg: Record<string, ContinentStat> = {};
  for (const m of COUNTRIES_META) {
    const c = continentAgg[m.continent] ?? {
      name: m.continent,
      color: CONTINENT_COLORS[m.continent] ?? "#94a3b8",
      visited: 0,
      countries: 0,
      territories: 0,
      total: 0,
      visitedTerritories: 0,
    };
    c.total++;
    if (m.un) c.countries++;
    else c.territories++;
    continentAgg[m.continent] = c;
  }

  const yearMap = new Map<number, string[]>();
  const undatedIds: string[] = [];
  let ratingSum = 0;
  let ratingCount = 0;

  for (const [id, e] of Object.entries(entries)) {
    const meta = BY_ID[id];
    if (!meta) continue;
    if (e.status === "wishlist") wishlistIds.push(id);
    if (e.status !== "visited") continue;
    visitedIds.push(id);
    if (meta.un) visitedCountries++;
    else visitedTerritories++;
    landKm2 += meta.area;
    popReach += meta.pop;
    const c = continentAgg[meta.continent];
    if (c) {
      c.visited++;
      if (!meta.un) c.visitedTerritories++;
    }
    if (e.years.length === 0) {
      undatedIds.push(id);
    } else {
      for (const y of e.years) {
        yearMap.set(y, [...(yearMap.get(y) ?? []), id]);
      }
    }
    if (e.rating > 0) {
      ratingSum += e.rating;
      ratingCount++;
    }
  }

  const yearGroups = [...yearMap.entries()]
    .map(([year, ids]) => ({ year, ids }))
    .sort((a, b) => b.year - a.year);

  const recentIds = Object.entries(entries)
    .filter(([, e]) => e.status === "visited")
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .slice(0, 6)
    .map(([id]) => id);

  const allYears = yearGroups.map((g) => g.year);

  return {
    visitedIds,
    wishlistIds,
    visitedCountries,
    visitedTerritories,
    worldCountries,
    worldTotal: COUNTRIES_META.length,
    pctWorld: worldCountries ? visitedCountries / worldCountries : 0,
    landKm2,
    landPct: worldLand ? landKm2 / worldLand : 0,
    popReach,
    popPct: worldPop ? popReach / worldPop : 0,
    continents: CONTINENT_ORDER.map(
      (name) =>
        continentAgg[name] ?? {
          name,
          color: CONTINENT_COLORS[name] ?? "#94a3b8",
          visited: 0,
          countries: 0,
          territories: 0,
          total: 0,
          visitedTerritories: 0,
        }
    ),
    yearGroups,
    undatedIds,
    earliestYear: allYears.length ? Math.min(...allYears) : null,
    ratingAvg: ratingCount ? ratingSum / ratingCount : 0,
    recentIds,
  };
}

/* ------------------------------------------------------------------ */
/* Achievement levels                                                  */
/* ------------------------------------------------------------------ */

export interface Level {
  min: number;
  title: string;
  blurb: string;
}

export const LEVELS: Level[] = [
  { min: 0, title: "Armchair Explorer", blurb: "The world awaits — start glowing." },
  { min: 1, title: "First Steps", blurb: "One country down, a planet to go." },
  { min: 5, title: "Weekend Wanderer", blurb: "Passport officially broken in." },
  { min: 10, title: "Border Hopper", blurb: "Customs officers know your face." },
  { min: 20, title: "Explorer", blurb: "Continents feel smaller already." },
  { min: 35, title: "Globetrotter", blurb: "Frequent-flyer miles for days." },
  { min: 50, title: "Continental Pro", blurb: "A quarter of the world, lit." },
  { min: 75, title: "World Nomad", blurb: "Home is wherever you land." },
  { min: 100, title: "Century Voyager", blurb: "Three digits of countries!" },
  { min: 150, title: "Earth Walker", blurb: "Borders are merely suggestions." },
  { min: 195, title: "World Conqueror", blurb: "Every country. Absolute legend." },
];

export function levelFor(count: number): { level: Level; index: number } {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (count >= LEVELS[i].min) index = i;
  }
  return { level: LEVELS[index], index };
}

export function nextLevelFor(count: number): Level | null {
  const { index } = levelFor(count);
  return LEVELS[index + 1] ?? null;
}

export { worldLand, worldPop, worldCountries };
