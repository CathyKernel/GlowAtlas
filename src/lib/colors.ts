/**
 * GlowAtlas color system — one live accent drives the whole UI and the map.
 */

export type AccentId = "gold";
export type MapThemeId = "midnight" | "daylight" | "silver" | "retro";
export type ProviderId = "google" | "open";

export interface AccentSpec {
  id: AccentId;
  label: string;
  /** main hue */
  hex: string;
  /** bright stroke / text on dark backgrounds */
  bright: string;
  /** deep variant for gradients */
  deep: string;
}

/** The one true accent: solar gold on black. */
export const ACCENTS: Record<AccentId, AccentSpec> = {
  gold: { id: "gold", label: "Solar Gold", hex: "#facc15", bright: "#fde047", deep: "#a16207" },
};

export const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[];

/** Safe lookup — falls back to gold for legacy persisted values. */
export function accentSpec(id: string | undefined | null): AccentSpec {
  return (id && ACCENTS[id as AccentId]) || ACCENTS.gold;
}

/** Wishlist is always amber — an outlined companion to the gold glow. */
export const WISH = { hex: "#f59e0b", bright: "#fbbf24", deep: "#b45309" };

/* ------------------------------------------------------------------ */
/* Country polygon visuals                                             */
/* ------------------------------------------------------------------ */

export interface CountryVisual {
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeOpacity: number;
  strokeWeight: number;
  /** leaflet css classes */
  cls: string;
  zIndex: number;
}

export type PolyState = "none" | "visited" | "wishlist";

export function visualFor(
  state: PolyState,
  accent: AccentSpec,
  opts: { selected?: boolean; hovered?: boolean } = {}
): CountryVisual {
  /* unvisited countries: warm graphite, barely-there on the black canvas */
  const base: CountryVisual = {
    fill: "#8a8578",
    fillOpacity: 0.07,
    stroke: "#6b675c",
    strokeOpacity: 0.3,
    strokeWeight: 0.6,
    cls: "country-path",
    zIndex: 1,
  };

  if (state === "visited") {
    base.fill = accent.hex;
    base.fillOpacity = opts.selected ? 0.8 : 0.62;
    base.stroke = accent.bright;
    base.strokeOpacity = opts.hovered ? 1 : opts.selected ? 0.95 : 0.85;
    base.strokeWeight = opts.selected ? 2.2 : opts.hovered ? 1.6 : 1;
    base.cls += " is-visited";
    base.zIndex = 3;
  } else if (state === "wishlist") {
    /* dashed amber outline — clearly distinct from the solid gold fill */
    base.fill = WISH.hex;
    base.fillOpacity = opts.selected ? 0.12 : 0.06;
    base.stroke = WISH.bright;
    base.strokeOpacity = opts.hovered ? 1 : 0.85;
    base.strokeWeight = opts.selected ? 2 : opts.hovered ? 1.5 : 1;
    base.cls += " is-wishlist";
    base.zIndex = 2;
  } else {
    base.fillOpacity = opts.hovered ? 0.16 : opts.selected ? 0.18 : 0.07;
    base.strokeOpacity = opts.hovered ? 0.7 : opts.selected ? 0.8 : 0.3;
    base.strokeWeight = opts.selected ? 1.6 : 0.6;
    base.zIndex = opts.hovered || opts.selected ? 2 : 1;
  }

  if (opts.selected) base.cls += " is-selected";
  return base;
}

/* ------------------------------------------------------------------ */
/* Map themes                                                          */
/* ------------------------------------------------------------------ */

export interface TileLayerSpec {
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom?: number;
}

export interface MapThemeSpec {
  id: MapThemeId;
  label: string;
  blurb: string;
  /** page/behind-tiles background */
  bg: string;
  /** google.maps styled-map array (null = default Google roadmap) */
  google: google.maps.MapTypeStyle[] | null;
  /** open-tile providers (Leaflet engine) — base + optional label overlay */
  tiles: TileLayerSpec[];
  /** preview gradient for theme cards */
  preview: string;
}

const ESRI_ATTR =
  'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, U.S. Census Bureau';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const GOOGLE_MIDNIGHT: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#111110" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0a08" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a09a8c" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#33312a" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#403c30" }] },
  { featureType: "administrative.land_parcel", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#141412" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#13130f" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1a18" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#22221e" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#050504" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#403c30" }] },
];

const GOOGLE_SILVER: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.land_parcel", elementType: "geometry.stroke", stylers: [{ color: "#dcdcdc" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#aeaeae" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9d6e8" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
];

const GOOGLE_RETRO: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#ebe3cd" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#523735" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f1e6" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c9b2a6" }] },
  { featureType: "administrative.land_parcel", elementType: "geometry.stroke", stylers: [{ color: "#dcd2be" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
  { featureType: "landscape.natural.terrain", elementType: "geometry", stylers: [{ color: "#b9d3a3" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#93817c" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#a3b592" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#f5f1e6" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8d7a6a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f8c96e" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e9bc62" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#d5c59c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#a8c8e8" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#92998d" }] },
];

export const MAP_THEMES: Record<MapThemeId, MapThemeSpec> = {
  midnight: {
    id: "midnight",
    label: "Blackout",
    blurb: "Pure black canvas — countries glow gold",
    bg: "#0a0a08",
    google: GOOGLE_MIDNIGHT,
    tiles: [
      {
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        attribution: ESRI_ATTR,
        maxZoom: 16,
      },
      {
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        attribution: "",
        maxZoom: 16,
      },
    ],
    preview: "linear-gradient(135deg, #0a0a08 0%, #201d12 55%, #facc15 140%)",
  },
  daylight: {
    id: "daylight",
    label: "Daylight",
    blurb: "Classic full-color OpenStreetMap",
    bg: "#e9e5dc",
    google: null, // Google's default roadmap
    tiles: [
      {
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: OSM_ATTR,
        maxZoom: 19,
      },
    ],
    preview: "linear-gradient(135deg, #e8e0d0 0%, #cfe3f0 60%, #7fb5d8 130%)",
  },
  silver: {
    id: "silver",
    label: "Silver",
    blurb: "Minimal monochrome gray",
    bg: "#e8e8e8",
    google: GOOGLE_SILVER,
    tiles: [
      {
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        attribution: ESRI_ATTR,
        maxZoom: 16,
      },
      {
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        attribution: "",
        maxZoom: 16,
      },
    ],
    preview: "linear-gradient(135deg, #d5d7db 0%, #eceef1 60%, #b9bdc4 130%)",
  },
  retro: {
    id: "retro",
    label: "Retro",
    blurb: "Vintage National Geographic paper",
    bg: "#e6d9b8",
    google: GOOGLE_RETRO,
    tiles: [
      {
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
        attribution: "Tiles &copy; National Geographic, Esri, Garmin, HERE, UNEP-WCMC, USGS, NASA",
        maxZoom: 16,
      },
    ],
    preview: "linear-gradient(135deg, #ece1c4 0%, #d9c9a3 55%, #a3b592 130%)",
  },
};

export const THEME_IDS = Object.keys(MAP_THEMES) as MapThemeId[];

/** Should UI panels treat this theme as light? */
export function themeIsLight(theme: MapThemeId): boolean {
  return theme !== "midnight";
}
