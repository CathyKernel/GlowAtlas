/**
 * Leaflet engine — the keyless "Open Basemap" provider.
 * Uses CARTO / OSM raster tiles; country polygons come from the bundled
 * Natural Earth GeoJSON and are styled to match the Google engine exactly.
 */

import type * as LeafletNS from "leaflet";
import { MAP_THEMES, type CountryVisual, type MapThemeId } from "@/lib/colors";
import type { AtlasEngine, EngineHooks, GeoJSONFeatureCollection, Padding } from "./engine";

export class LeafletEngine implements AtlasEngine {
  private L!: typeof LeafletNS;
  private map!: LeafletNS.Map;
  private layer!: LeafletNS.GeoJSON;
  private tiles: LeafletNS.Layer[] = [];
  private paths = new Map<string, LeafletNS.Path>();
  private container!: HTMLElement;
  private hooks!: EngineHooks;
  private theme: MapThemeId = "midnight";

  async mount(container: HTMLElement, hooks: EngineHooks, theme: MapThemeId): Promise<void> {
    this.container = container;
    this.hooks = hooks;
    this.theme = theme;
    const L = (await import("leaflet")).default;
    this.L = L;

    const spec = MAP_THEMES[theme];
    container.classList.toggle("map-blackout", theme === "midnight");
    this.map = L.map(container, {
      center: [24, 14],
      zoom: 2.25,
      minZoom: 1.25,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 140,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: true,
    });

    this.tiles = spec.tiles.map((t) => this.makeTileLayer(t, spec));
    for (const t of this.tiles) t.addTo(this.map);

    this.map.on("click", () => this.hooks.onMapClick());

    hooks.onReady();
  }

  private makeTileLayer(t: { url: string; attribution: string; subdomains?: string; maxZoom?: number }, spec: { tiles: { maxZoom?: number }[] }): LeafletNS.TileLayer {
    const maxZoom = Math.max(...spec.tiles.map((x) => x.maxZoom ?? 19));
    return this.L.tileLayer(t.url, {
      attribution: t.attribution,
      subdomains: t.subdomains ?? "abc",
      maxZoom,
      maxNativeZoom: t.maxZoom ?? maxZoom,
      detectRetina: false,
      crossOrigin: true,
    });
  }

  async loadCountries(fc: GeoJSONFeatureCollection): Promise<void> {
    const L = this.L;
    this.layer = L.geoJSON(fc as unknown as GeoJSON.GeoJsonObject, {
      bubblingMouseEvents: false, // country clicks must not trigger the map click → deselect
      style: () => ({ stroke: true, fill: true }),
      onEachFeature: (feature, layer) => {
        const id = feature.properties?.id as string | undefined;
        if (!id) return;
        this.paths.set(id, layer as unknown as LeafletNS.Path);
        layer.on("click", (e: LeafletNS.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          this.hooks.onCountryClick(id, { x: e.containerPoint.x, y: e.containerPoint.y });
        });
        layer.on("mouseover", (e: LeafletNS.LeafletMouseEvent) => {
          this.hooks.onCountryHover(id, { x: e.containerPoint.x, y: e.containerPoint.y });
        });
        layer.on("mouseout", () => this.hooks.onCountryHover(null, { x: 0, y: 0 }));
      },
    });
    this.layer.addTo(this.map);
    this.layer.bringToBack?.();
  }

  applyStyles(styles: Record<string, CountryVisual>): void {
    for (const [id, v] of Object.entries(styles)) {
      const path = this.paths.get(id);
      if (!path) continue;
      path.setStyle({
        color: v.stroke,
        weight: v.strokeWeight,
        opacity: v.strokeOpacity,
        fillColor: v.fill,
        fillOpacity: v.fillOpacity,
      });
      // Toggle only our own classes — never overwrite Leaflet's
      // `leaflet-interactive` (it is what makes paths clickable/hoverable).
      const el = (path as unknown as { getElement?: () => SVGElement | null }).getElement?.();
      if (el) {
        el.classList.add("country-path");
        el.classList.toggle("is-visited", v.cls.includes("is-visited"));
        el.classList.toggle("is-wishlist", v.cls.includes("is-wishlist"));
        el.classList.toggle("is-selected", v.cls.includes("is-selected"));
      }
    }
  }

  pulseCountry(id: string): void {
    const path = this.paths.get(id);
    const el = (path as unknown as { getElement?: () => SVGElement | null })?.getElement?.();
    if (!el) return;
    el.classList.add("just-lit");
    window.setTimeout(() => el.classList.remove("just-lit"), 900);
  }

  focusCountry(id: string, pad: Padding): boolean {
    const path = this.paths.get(id) as unknown as
      | (LeafletNS.Layer & { getBounds?: () => LeafletNS.LatLngBoundsExpression })
      | undefined;
    if (!path?.getBounds) return false;
    const bounds = path.getBounds();
    if (!bounds) return false;
    this.map.fitBounds(bounds, {
      paddingTopLeft: [pad.left, pad.top] as LeafletNS.PointTuple,
      paddingBottomRight: [pad.right, pad.bottom] as LeafletNS.PointTuple,
      animate: true,
    });
    return true;
  }

  zoomBy(delta: number): void {
    this.map.setZoom(this.map.getZoom() + delta * 0.5);
  }

  resetView(): void {
    this.map.flyTo([24, 14], 2.25, { duration: 0.8 });
  }

  onResize(): void {
    this.map.invalidateSize();
  }

  setTheme(theme: MapThemeId): void {
    this.theme = theme;
    const spec = MAP_THEMES[theme];
    this.container?.classList.toggle("map-blackout", theme === "midnight");
    for (const t of this.tiles) this.map.removeLayer(t);
    this.tiles = spec.tiles.map((t) => this.makeTileLayer(t, spec));
    for (const t of this.tiles) {
      t.addTo(this.map);
      (t as unknown as { bringToBack?: () => void }).bringToBack?.();
    }
    if (this.layer) this.layer.bringToBack?.();
  }

  destroy(): void {
    this.map?.remove();
    this.paths.clear();
    this.tiles = [];
  }
}
