/**
 * Shared contract implemented by both map engines
 * (Google Maps data layer · Leaflet + open basemaps).
 */

import type { CountryVisual, MapThemeId } from "@/lib/colors";

export interface Pt {
  x: number;
  y: number;
}

export interface EngineHooks {
  onCountryClick: (id: string, pt: Pt) => void;
  onCountryHover: (id: string | null, pt: Pt) => void;
  onMapClick: () => void;
  onReady: () => void;
  onError: (message: string) => void;
}

export interface Padding {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface AtlasEngine {
  mount(container: HTMLElement, hooks: EngineHooks, theme: MapThemeId): Promise<void>;
  loadCountries(fc: GeoJSONFeatureCollection): Promise<void>;
  applyStyles(styles: Record<string, CountryVisual>): void;
  pulseCountry(id: string): void;
  focusCountry(id: string, pad: Padding): boolean;
  zoomBy(delta: number): void;
  resetView(): void;
  onResize(): void;
  setTheme(theme: MapThemeId): void;
  destroy(): void;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    properties: Record<string, unknown> & { id: string };
    geometry: unknown;
  }[];
}
