#!/usr/bin/env bun
/**
 * prepare-countries.ts — builds the bundled world dataset for GlowAtlas.
 *
 * Sources (both free, no API key):
 *   1. Natural Earth 50m admin-0 countries GeoJSON (geometry, continent, ISO codes)
 *   2. mledoze/countries dataset (common names, UN membership, population, area,
 *      lat/lng, ISO codes — the source that powered restcountries.com)
 *
 * Outputs:
 *   public/data/countries.geojson  — full geometry + slim properties (map layer)
 *   src/data/countries-meta.ts     — compact metadata array (instant sidebar / stats)
 *   scripts/data/summary.json      — build report for inspection
 *
 * Run:  bun scripts/prepare-countries.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";

const NE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const RC_URL = "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";

const OUT_GEOJSON = "public/data/countries.geojson";
const OUT_META = "src/data/countries-meta.ts";
const OUT_SUMMARY = "scripts/data/summary.json";

const R = 6371.0088; // mean Earth radius, km (spherical approximation)
const rad = (d: number) => (d * Math.PI) / 180;

// Travel-app convention: the world has 195 "countries" = 193 UN members +
// the two observer states (Holy See, Palestine). mledoze marks Vatican as a
// member but Palestine as non-member — normalise both to the 195 convention.
const COUNTRY_EXTRA = new Set(["VAT", "PSE"]);
// NE features that are not meaningful travel destinations — dropped.
const NE_SKIP = new Set(["KAS"]); // Siachen Glacier disputed zone

type Ring = number[][];
interface RC {
  name: { common: string; official: string };
  cca2: string;
  cca3: string;
  unMember: boolean;
  region: string;
  subregion: string;
  population: number;
  area: number;
  latlng: [number, number];
}

/** Signed spherical area of a ring in km². */
function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [l1, p1] = ring[i];
    const [l2, p2] = ring[i + 1];
    sum += (rad(l2) - rad(l1)) * (2 + Math.sin(rad(p1)) + Math.sin(rad(p2)));
  }
  return (sum * R * R) / 2;
}

function polygonArea(rings: Ring[]): number {
  // first ring = outer, rest = holes
  let a = Math.abs(ringArea(rings[0]));
  for (let i = 1; i < rings.length; i++) a -= Math.abs(ringArea(rings[i]));
  return Math.max(a, 0);
}

/** Planar centroid of a ring (good enough as a map anchor). */
function ringCentroid(ring: Ring): [number, number] {
  let a = 0,
    cx = 0,
    cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    const f = x1 * y2 - x2 * y1;
    a += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  if (Math.abs(a) < 1e-12) return [ring[0][0], ring[0][1]];
  return [cx / (3 * a), cy / (3 * a)];
}

function roundCoords(coords: any, dp: number): any {
  const f = Math.pow(10, dp);
  const walk = (c: any): any =>
    Array.isArray(c[0]) ? c.map(walk) : [Math.round(c[0] * f) / f, Math.round(c[1] * f) / f];
  return walk(coords);
}

function bboxOf(coords: any): [number, number, number, number] {
  let w = Infinity,
    s = Infinity,
    e = -Infinity,
    n = -Infinity;
  const walk = (c: any) => {
    if (typeof c[0] === "number") {
      w = Math.min(w, c[0]);
      e = Math.max(e, c[0]);
      s = Math.min(s, c[1]);
      n = Math.max(n, c[1]);
    } else c.forEach(walk);
  };
  walk(coords);
  return [w, s, e, n];
}

// Nicer display names for a few NE-only features.
const NE_NAME_FIX: Record<string, string> = {
  "N. Cyprus": "Northern Cyprus",
  "W. Sahara": "Western Sahara",
  "Falkland Is.": "Falkland Islands",
  "Fr. S. Antarctic Lands": "French Southern Territories",
  "French Southern and Antarctic Lands": "French Southern Territories",
  "South Georgia": "South Georgia and the South Sandwich Islands",
  "S. Geo. and the Is.": "South Georgia and the South Sandwich Islands",
  "Faeroe Is.": "Faroe Islands",
  "Cook Is.": "Cook Islands",
  "Marshall Is.": "Marshall Islands",
  "Solomon Is.": "Solomon Islands",
  "Turks and Caicos Is.": "Turks and Caicos Islands",
  "Cayman Is.": "Cayman Islands",
  "Br. Indian Ocean Ter.": "British Indian Ocean Territory",
  "U.S. Virgin Is.": "United States Virgin Islands",
  "British Virgin Is.": "British Virgin Islands",
  "St. Vin. and Gren.": "Saint Vincent and the Grenadines",
  "St. Kitts and Nevis": "Saint Kitts and Nevis",
  "St. Pierre and Miquelon": "Saint Pierre and Miquelon",
  "Heard I. and McDonald Is.": "Heard Island and McDonald Islands",
  "Wallis and Futuna Is.": "Wallis and Futuna",
  "Dominican Rep.": "Dominican Republic",
  "Central African Rep.": "Central African Republic",
  "S. Sudan": "South Sudan",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Eq. Guinea": "Equatorial Guinea",
  "Dem. Rep. Congo": "DR Congo",
  "Cabo Verde": "Cape Verde",
  "Côte d'Ivoire": "Ivory Coast",
  "Macedonia": "North Macedonia",
  "Swaziland": "Eswatini",
  "Lao PDR": "Laos",
  "Dem. Rep. Korea": "North Korea",
  "Republic of Korea": "South Korea",
  "Korea": "South Korea",
  "Russian Federation": "Russia",
  "United Republic of Tanzania": "Tanzania",
  "Republic of Serbia": "Serbia",
  "Macedonia (FYROM)": "North Macedonia",
  "eSwatini": "Eswatini",
  "São Tomé and Principe": "São Tomé and Príncipe",
  "Saint Helena": "Saint Helena, Ascension and Tristan da Cunha",
  "Åland": "Åland Islands",
  "Micronesia": "Micronesia",
  "United States Minor Outlying Islands": "U.S. Minor Outlying Islands",
};

async function main() {
  mkdirSync("scripts/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  mkdirSync("src/data", { recursive: true });

  console.log("⬇ Downloading Natural Earth 50m admin-0 …");
  const ne = await (await fetch(NE_URL)).json();
  console.log(`   ${ne.features.length} features`);

  console.log("⬇ Downloading mledoze/countries metadata …");
  const rcRaw = (await (await fetch(RC_URL)).json()) as RC[];
  console.log(`   ${rcRaw.length} entries`);
  const rcByIso3 = new Map<string, RC>();
  for (const c of rcRaw) rcByIso3.set(c.cca3, c);
  const rcByName = new Map<string, RC>();
  for (const c of rcRaw) rcByName.set(c.name.common.toLowerCase(), c);

  interface Meta {
    id: string;
    name: string;
    iso2: string | null;
    un: boolean;
    continent: string;
    subregion: string;
    pop: number;
    area: number;
    lat: number;
    lng: number;
    bbox: [number, number, number, number];
    type: "country" | "territory";
  }

  const metas: Meta[] = [];
  const geometries = new Map<string, any>();
  const unmatched: string[] = [];
  const usedIso3 = new Set<string>();

  const normContinent = (c: string, fallback: string): string => {
    const t = c.trim();
    if (t.startsWith("Seven seas")) return fallback;
    if (t === "Antarctic") return "Antarctica";
    return t;
  };

  // mledoze uses "Americas" as one region — split by subregion to match the
  // Natural Earth North/South America convention.
  const fixRegion = (region: string, subregion: string, id: string): string => {
    if (region === "Americas") {
      if (id === "UMI") return "Oceania"; // Pacific atolls
      return subregion === "South America" ? "South America" : "North America";
    }
    return region;
  };

  for (const f of ne.features) {
    const p = f.properties ?? {};
    const pick = (...keys: string[]): string => {
      for (const k of keys) {
        const v = p[k];
        if (typeof v === "string" && v.trim() !== "" && v !== "-99") return v.trim();
      }
      return "";
    };
    const adm0 = pick("ADM0_A3", "SU_A3", "BRK_A3");
    if (NE_SKIP.has(adm0)) {
      console.log(`↷ skipping ${adm0} · ${pick("NAME_LONG", "NAME")} (not a destination)`);
      continue;
    }
    let iso3 = pick("ISO_A3_EH", "ISO_A3") || adm0;
    // Special user-assigned codes
    if (iso3 === "KOS" || iso3 === "XKX") iso3 = "UNK"; // Kosovo — REST Countries uses UNK
    let rc = rcByIso3.get(iso3);
    if (!rc && adm0) {
      const byAdm: Record<string, string> = {
        KOS: "UNK",
        SOL: "",
        CYN: "",
        SDS: "SSD",
        PSX: "PSE",
        SAH: "ESH",
        KAS: "",
        ATG: "",
      };
      const alt = byAdm[adm0];
      if (alt) rc = rcByIso3.get(alt);
    }
    const neName = pick("NAME_LONG", "NAME", "ADMIN");
    if (!rc && neName) {
      const candidates = [NE_NAME_FIX[neName], neName].filter(Boolean);
      for (const cand of candidates) {
        rc = rcByName.get(cand.toLowerCase());
        if (rc) break;
      }
    }

    const iso2 = rc?.cca2 ?? (pick("ISO_A2_EH", "ISO_A2") !== "" ? pick("ISO_A2_EH", "ISO_A2") : null);
    const name = rc?.name.common ?? NE_NAME_FIX[neName] ?? neName;
    const subregion = rc?.subregion ?? pick("SUBREGION") ?? "";
    const continent = fixRegion(
      normContinent(pick("CONTINENT") || rc?.region || "Unassigned", rc?.region ?? "Oceania"),
      subregion,
      iso3
    );
    const pop = rc?.population ?? (typeof p.POP_EST === "number" && p.POP_EST > 0 ? p.POP_EST : 0);
    const un = COUNTRY_EXTRA.has(iso3) || (rc?.unMember ?? false);
    if (!rc) unmatched.push(`${iso3} · ${neName}`);

    const geom = f.geometry;
    let area = rc?.area ?? 0;
    if (!area && geom) {
      const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
      area = polys.reduce((s: number, pgs: any) => s + polygonArea(pgs), 0);
    }

    // bbox + anchor centroid (largest polygon)
    let bbox: [number, number, number, number] = [0, 0, 0, 0];
    let anchor: [number, number] = rc?.latlng ?? [0, 0];
    if (geom) {
      bbox = bboxOf(geom.coordinates).map((v: number) => Math.round(v * 100) / 100) as [
        number,
        number,
        number,
        number
      ];
      const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
      let best = -1,
        bestArea = -1;
      polys.forEach((pgs: any, i: number) => {
        const a = Math.abs(ringArea(pgs[0]));
        if (a > bestArea) {
          bestArea = a;
          best = i;
        }
      });
      if (best >= 0) {
        const c = ringCentroid(polys[best][0]);
        anchor = [c[1], c[0]]; // lat, lng
      }
    }
    if (!rc?.latlng && anchor[0] === 0 && anchor[1] === 0) anchor = [bbox[1] + bbox[3], bbox[0] + bbox[2]].map((v) => v / 2) as [number, number];

    const meta: Meta = {
      id: iso3,
      name,
      iso2,
      un,
      continent,
      subregion,
      pop: Math.round(pop),
      area: Math.round(area),
      lat: Math.round(anchor[0] * 1000) / 1000,
      lng: Math.round(anchor[1] * 1000) / 1000,
      bbox,
      type: un ? "country" : "territory",
    };
    if (usedIso3.has(iso3)) {
      console.warn(`⚠ duplicate id ${iso3} (${name}) — skipping later one`);
      continue;
    }
    usedIso3.add(iso3);
    metas.push(meta);
    geometries.set(iso3, geom);
  }

  // REST Countries entries that have no Natural Earth polygon → synthesize a
  // small square polygon so every country & major territory is markable.
  const missing = rcRaw.filter((c) => !usedIso3.has(c.cca3) && c.latlng?.length === 2);
  for (const c of missing) {
    const [lat, lng] = c.latlng;
    const half = 0.045; // ~5 km half-width — findable when zoomed in
    const square: Ring = [
      [lng - half, lat - half],
      [lng + half, lat - half],
      [lng + half, lat + half],
      [lng - half, lat + half],
      [lng - half, lat - half],
    ];
    geometries.set(c.cca3, { type: "Polygon", coordinates: [square] });
    metas.push({
      id: c.cca3,
      name: c.name.common,
      iso2: c.cca2,
      un: c.unMember,
      continent: normContinent(c.region, "Oceania"),
      subregion: c.subregion ?? "",
      pop: c.population ?? 0,
      area: c.area ?? Math.round(half * 222 * 2 * (half * 111 * 2)),
      lat,
      lng,
      bbox: [lng - half, lat - half, lng + half, lat + half],
      type: c.unMember ? "country" : "territory",
    });
    usedIso3.add(c.cca3);
  }

  // ---- Build outputs -------------------------------------------------------
  // Uniform continent normalisation (both NE and synthesized paths)
  for (const m of metas) {
    if (m.continent === "Antarctic") m.continent = "Antarctica";
    m.continent = fixRegion(m.continent, m.subregion, m.id);
  }

  metas.sort((a, b) => a.name.localeCompare(b.name));

  const fc = {
    type: "FeatureCollection",
    features: metas
      .map((m) => ({
        type: "Feature",
        properties: {
          id: m.id,
          name: m.name,
          iso2: m.iso2 ?? "",
          un: m.un ? 1 : 0,
          continent: m.continent,
          subregion: m.subregion,
          pop: m.pop,
          area: m.area,
          lat: m.lat,
          lng: m.lng,
          bbox: m.bbox,
        },
        geometry: geometries.get(m.id),
      }))
      .filter((f) => f.geometry),
  };

  // Coordinate rounding for size (4 dp ≈ 11 m — invisible at country scale)
  for (const f of fc.features) {
    f.geometry = {
      type: f.geometry.type,
      coordinates: roundCoords(f.geometry.coordinates, 4),
    };
  }

  const geojsonStr = JSON.stringify(fc);
  writeFileSync(OUT_GEOJSON, geojsonStr);

  const metaTs = `// AUTO-GENERATED by scripts/prepare-countries.ts — do not edit by hand.
// Sources: Natural Earth 4 (50m admin-0) + REST Countries v3.1
export interface CountryMeta {
  id: string; // ISO3 / NE id — unique key
  name: string;
  iso2: string | null;
  un: boolean; // UN member state?
  continent: string;
  subregion: string;
  pop: number;
  area: number; // km²
  lat: number;
  lng: number;
  bbox: [number, number, number, number];
  type: "country" | "territory";
}

export const COUNTRIES_META: CountryMeta[] = ${JSON.stringify(metas)};
`;
  writeFileSync(OUT_META, metaTs);

  const unCount = metas.filter((m) => m.un).length;
  const continents = [...new Set(metas.map((m) => m.continent))].sort();
  const summary = {
    total: metas.length,
    unMembers: unCount,
    territories: metas.length - unCount,
    continents: continents.map((c) => ({
      name: c,
      total: metas.filter((m) => m.continent === c).length,
      un: metas.filter((m) => m.continent === c && m.un).length,
    })),
    landAreaKm2: Math.round(metas.reduce((s, m) => s + m.area, 0)),
    population: metas.reduce((s, m) => s + m.pop, 0),
    geojsonMB: +(geojsonStr.length / 1048576).toFixed(2),
    unmatchedNE: unmatched,
    synthesized: missing.map((m) => `${m.cca3} ${m.name.common}`),
    microCheck: ["VAT", "MCO", "SMR", "AND", "LIE", "MLT", "SGP", "TWN", "PSE", "UNK", "ATA"].map(
      (id) => `${id}: ${metas.some((m) => m.id === id) ? "✓" : "✗"}`
    ),
  };
  writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2));
  console.log("\n==== SUMMARY ====");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
