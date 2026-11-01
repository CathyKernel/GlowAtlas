/**
 * Google Maps engine — the primary, requested provider.
 * Country polygons render through the built-in `map.data` GeoJSON layer
 * and are styled identically to the Leaflet fallback engine.
 */

import { MAP_THEMES, type CountryVisual, type MapThemeId } from "@/lib/colors";
import { loadGoogleMaps, onGoogleAuthFailure } from "./google-loader";
import type { AtlasEngine, EngineHooks, GeoJSONFeatureCollection, Padding } from "./engine";

type GoogleMaps = typeof google.maps;
type BBox = [number, number, number, number]; // w, s, e, n

export class GoogleEngine implements AtlasEngine {
  private g!: GoogleMaps;
  private map!: google.maps.Map;
  private container!: HTMLElement;
  private hooks!: EngineHooks;
  private theme: MapThemeId = "midnight";
  private styles: Record<string, CountryVisual> = {};
  private bboxes = new Map<string, BBox>();
  private lastPt = { x: 0, y: 0 };
  private domCleanups: (() => void)[] = [];

  constructor(private apiKey: string) {}

  async mount(container: HTMLElement, hooks: EngineHooks, theme: MapThemeId): Promise<void> {
    this.container = container;
    this.hooks = hooks;
    this.theme = theme;

    try {
      this.g = await loadGoogleMaps(this.apiKey);
    } catch (err) {
      hooks.onError(err instanceof Error ? err.message : String(err));
      throw err;
    }

    // Auth failures can surface *after* the script loads and the map mounts —
    // keep listening so the UI can offer the open-basemap fallback.
    const offAuth = onGoogleAuthFailure((message) => hooks.onError(message));
    this.domCleanups.push(offAuth);

    const spec = MAP_THEMES[theme];
    this.map = new this.g.Map(container, {
      center: { lat: 24, lng: 14 },
      zoom: 2,
      minZoom: 1,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: "greedy",
      clickableIcons: false,
      styles: spec.google ?? undefined,
      backgroundColor: spec.bg,
    });

    // Track the pointer so click/hover events can anchor React overlays.
    const onMove = (e: MouseEvent) => {
      const r = container.getBoundingClientRect();
      this.lastPt = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    container.addEventListener("mousemove", onMove);
    this.domCleanups.push(() => container.removeEventListener("mousemove", onMove));

    this.map.addListener("click", () => this.hooks.onMapClick());

    this.map.data.addListener("click", (e) => {
      const id = e.feature.getProperty("id") as string | undefined;
      if (id) this.hooks.onCountryClick(id, this.lastPt);
    });
    this.map.data.addListener("mouseover", (e) => {
      const id = e.feature.getProperty("id") as string | undefined;
      if (id) this.hooks.onCountryHover(id, this.lastPt);
    });
    this.map.data.addListener("mouseout", () => this.hooks.onCountryHover(null, this.lastPt));

    hooks.onReady();
  }

  async loadCountries(fc: GeoJSONFeatureCollection): Promise<void> {
    this.map.data.addGeoJson(fc, { idPropertyName: "id" });
    for (const f of fc.features) {
      const bbox = f.properties.bbox as BBox | undefined;
      if (bbox) this.bboxes.set(f.properties.id, bbox);
    }
    this.applyStyles(this.styles);
  }

  applyStyles(styles: Record<string, CountryVisual>): void {
    this.styles = styles;
    // Re-calling setStyle forces every feature to be re-evaluated.
    this.map.data.setStyle((feature) => {
      const id = feature.getProperty("id") as string;
      const v = styles[id];
      if (!v) return { visible: false } as google.maps.DataStyleOptions;
      return {
        fillColor: v.fill,
        fillOpacity: v.fillOpacity,
        strokeColor: v.stroke,
        strokeOpacity: v.strokeOpacity,
        strokeWeight: v.strokeWeight,
        zIndex: v.zIndex,
        cursor: "pointer",
      };
    });
  }

  pulseCountry(id: string): void {
    const feature = this.map.data.getFeatureById(id);
    if (!feature) return;
    this.map.data.overrideStyle(feature, { strokeWeight: 4, strokeOpacity: 1 });
    window.setTimeout(() => this.map.data.revertStyle(feature), 700);
  }

  focusCountry(id: string, pad: Padding): boolean {
    const bbox = this.bboxes.get(id);
    if (!bbox) return false;
    const [w, s, e, n] = bbox;
    this.map.fitBounds(
      { west: w, south: s, east: e, north: n },
      { top: pad.top, right: pad.right, bottom: pad.bottom, left: pad.left }
    );
    return true;
  }

  zoomBy(delta: number): void {
    const z = this.map.getZoom();
    this.map.setZoom(Math.max(1, Math.min(18, z + delta)));
  }

  resetView(): void {
    this.map.setCenter({ lat: 24, lng: 14 });
    this.map.setZoom(2);
  }

  onResize(): void {
    // Maps JS observes its container on its own.
  }

  setTheme(theme: MapThemeId): void {
    this.theme = theme;
    const spec = MAP_THEMES[theme];
    this.map.setOptions({ styles: spec.google ?? undefined, backgroundColor: spec.bg });
  }

  destroy(): void {
    this.domCleanups.forEach((fn) => fn());
    this.domCleanups = [];
    this.bboxes.clear();
    if (this.container) this.container.innerHTML = "";
  }
}
