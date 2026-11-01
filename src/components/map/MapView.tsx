"use client";

import "leaflet/dist/leaflet.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Globe2, Loader2, MapPin, Minus, Plus, Sparkles, Star, X } from "lucide-react";
import { toast } from "sonner";

import { BY_ID, COUNTRIES_META, flagEmoji } from "@/lib/atlas";
import { ACCENTS, visualFor, type CountryVisual } from "@/lib/colors";
import { bus } from "@/lib/bus";
import { useAtlas } from "@/lib/store";
import { withBase } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FlagImg } from "@/components/atlas/bits";
import type { AtlasEngine, EngineHooks, GeoJSONFeatureCollection, Padding, Pt } from "./engine";

/* ------------------------------------------------------------------ */
/* GeoJSON — fetched once, cached module-wide                          */
/* ------------------------------------------------------------------ */

let fcCache: Promise<GeoJSONFeatureCollection> | null = null;

function loadCountriesGeoJson(): Promise<GeoJSONFeatureCollection> {
  if (!fcCache) {
    fcCache = fetch(withBase("/data/countries.geojson")).then((r) => {
      if (!r.ok) throw new Error(`countries.geojson → HTTP ${r.status}`);
      return r.json();
    });
    fcCache.catch(() => {
      fcCache = null;
    });
  }
  return fcCache;
}

function mapPadding(): Padding {
  const wide = typeof window !== "undefined" && window.innerWidth >= 1280;
  return { left: wide ? 430 : 24, top: 96, right: 80, bottom: 170 };
}

/* ------------------------------------------------------------------ */
/* MapView                                                             */
/* ------------------------------------------------------------------ */

export default function MapView() {
  const holder = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AtlasEngine | null>(null);

  const [engineReady, setEngineReady] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [popup, setPopup] = useState<{ id: string; x: number; y: number } | null>(null);

  const provider = useAtlas((s) => s.provider);
  const googleKey = useAtlas((s) => s.googleKey);
  const theme = useAtlas((s) => s.theme);
  const accent = useAtlas((s) => s.accent);
  const entries = useAtlas((s) => s.entries);
  const selected = useAtlas((s) => s.selected);
  const quickMode = useAtlas((s) => s.quickMode);

  /* ---------------- engine lifecycle ---------------- */

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    let cancelled = false;
    let engine: AtlasEngine | null = null;

    setEngineError(null);
    setEngineReady(false);
    setDataLoaded(false);

    const hooks: EngineHooks = {
      onCountryClick: (id, pt) => {
        const st = useAtlas.getState();
        if (st.quickMode) {
          const wasVisited = st.entries[id]?.status === "visited";
          st.setStatus(id, wasVisited ? "none" : "visited");
          engineRef.current?.pulseCountry(id);
          const meta = BY_ID[id];
          if (meta) {
            if (wasVisited) toast(`${meta.name} dimmed`);
            else toast(`${meta.name} lit up`, { icon: flagEmoji(meta.iso2) });
          }
          setPopup(null);
        } else {
          st.select(id);
          setPopup({ id, x: pt.x, y: pt.y });
        }
      },
      onCountryHover: (id, pt) => setHover(id ? { id, x: pt.x, y: pt.y } : null),
      onMapClick: () => {
        setPopup(null);
        useAtlas.getState().select(null);
      },
      onReady: () => setEngineReady(true),
      onError: (message) => setEngineError(message),
    };

    (async () => {
      try {
        if (provider === "google") {
          const key = googleKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
          if (!key) throw new Error("No Google Maps API key configured yet.");
          const { GoogleEngine } = await import("./google-engine");
          engine = new GoogleEngine(key);
        } else {
          const { LeafletEngine } = await import("./leaflet-engine");
          engine = new LeafletEngine();
        }
        if (cancelled) return;
        await engine.mount(el, hooks, useAtlas.getState().theme);
        if (cancelled) {
          engine.destroy();
          return;
        }
        engineRef.current = engine;

        const fc = await loadCountriesGeoJson();
        if (cancelled) return;
        await engine.loadCountries(fc);
        if (cancelled) return;
        setDataLoaded(true);
      } catch (err) {
        if (!cancelled) {
          setEngineError(
            err instanceof Error ? err.message : "The map engine failed to start."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      engineRef.current = null;
      engine?.destroy();
    };
  }, [provider, googleKey]);

  /* ---------------- restyle on state changes ---------------- */

  useEffect(() => {
    if (!engineRef.current || !engineReady || !dataLoaded) return;
    const spec = ACCENTS[accent] ?? ACCENTS.gold;
    const styles: Record<string, CountryVisual> = {};
    for (const m of COUNTRIES_META) {
      styles[m.id] = visualFor(entries[m.id]?.status ?? "none", spec, {
        selected: selected === m.id,
        hovered: hover?.id === m.id,
      });
    }
    engineRef.current.applyStyles(styles);
  }, [entries, accent, selected, hover, engineReady, dataLoaded]);

  /* ---------------- theme switching ---------------- */

  useEffect(() => {
    if (engineRef.current && engineReady) engineRef.current.setTheme(theme);
  }, [theme, engineReady]);

  /* ---------------- bus wiring ---------------- */

  useEffect(() => {
    const offFocus = bus.on("focus", ({ id }) => {
      engineRef.current?.focusCountry(id, mapPadding());
      useAtlas.getState().select(id);
      engineRef.current?.pulseCountry(id);
    });
    const offPulse = bus.on("pulse", ({ id }) => engineRef.current?.pulseCountry(id));
    return () => {
      offFocus();
      offPulse();
    };
  }, []);

  /* ---------------- resize ---------------- */

  useEffect(() => {
    const el = holder.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => engineRef.current?.onResize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------------- keyboard ---------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPopup(null);
        useAtlas.getState().select(null);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        bus.emit("openSearch", undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------- popup helpers ---------------- */

  const setEntryStatus = useCallback(
    (id: string, status: "visited" | "wishlist" | "none") => {
      const st = useAtlas.getState();
      st.setStatus(id, status);
      if (status !== "none") engineRef.current?.pulseCountry(id);
      const meta = BY_ID[id];
      if (meta) {
        if (status === "visited") toast(`${meta.name} lit up`, { icon: flagEmoji(meta.iso2) });
        if (status === "wishlist") toast(`${meta.name} saved to wishlist`, { icon: "✨" });
        if (status === "none") toast(`${meta.name} cleared`);
      }
    },
    []
  );

  const hoverMeta = hover ? BY_ID[hover.id] : null;
  const popupMeta = popup ? BY_ID[popup.id] : null;
  const popupEntry = popup ? entries[popup.id] : undefined;

  const popupPos = useMemo(() => {
    if (!popup || !holder.current) return { left: 0, top: 0 };
    const rect = holder.current.getBoundingClientRect();
    const left = Math.min(Math.max(popup.x + 14, 12), Math.max(rect.width - 288, 12));
    const top = Math.min(Math.max(popup.y - 12, 64), Math.max(rect.height - 208, 64));
    return { left, top };
  }, [popup]);

  const busy = !engineError && (!engineReady || !dataLoaded);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div
        ref={holder}
        className={provider === "google" ? "gmaps-holder h-full w-full" : "h-full w-full"}
        aria-label="World map — click a country to mark it as visited"
      />

      {/* hover tooltip */}
      <AnimatePresence>
        {hoverMeta && (
          <motion.div
            key="hover-tip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute z-[850] glass-soft rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg"
            style={{
              left: Math.min(hover!.x + 16, (holder.current?.clientWidth ?? 400) - 180),
              top: hover!.y - 34,
            }}
          >
            <span className="mr-1.5">{flagEmoji(hoverMeta.iso2)}</span>
            {hoverMeta.name}
            <span
              className="ml-2 font-normal"
              style={{
                color:
                  useAtlas.getState().entries[hoverMeta.id]?.status === "visited"
                    ? "var(--glow)"
                    : useAtlas.getState().entries[hoverMeta.id]?.status === "wishlist"
                      ? "var(--wish)"
                      : "var(--muted-foreground)",
              }}
            >
              {useAtlas.getState().entries[hoverMeta.id]?.status === "visited"
                ? "visited"
                : useAtlas.getState().entries[hoverMeta.id]?.status === "wishlist"
                  ? "wishlist"
                  : quickMode
                    ? "· click to light up"
                    : ""}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* country action popup */}
      <AnimatePresence>
        {popupMeta && (
          <motion.div
            key={popup!.id}
            initial={{ opacity: 0, scale: 0.92, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className="absolute z-[860] w-64 glass-panel rounded-2xl p-3"
            style={popupPos}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <FlagImg iso2={popupMeta.iso2} name={popupMeta.name} w={40} className="h-7 w-9 shrink-0" />
                <div className="min-w-0">
                  <div className="font-display font-semibold leading-tight truncate">
                    {popupMeta.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {popupMeta.subregion || popupMeta.continent}
                  </div>
                </div>
              </div>
              <button
                className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setPopup(null)}
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <button
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-semibold transition ${
                  popupEntry?.status === "visited"
                    ? "border-transparent text-black"
                    : "border-border text-foreground hover:border-glow/60 hover:text-glow"
                }`}
                style={
                  popupEntry?.status === "visited"
                    ? { background: "var(--glow)" }
                    : undefined
                }
                onClick={() => setEntryStatus(popupMeta.id, "visited")}
              >
                <Check className="h-4 w-4" /> Visited
              </button>
              <button
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-semibold transition ${
                  popupEntry?.status === "wishlist"
                    ? "border-transparent text-black"
                    : "border-border text-foreground hover:border-wish/70"
                }`}
                style={
                  popupEntry?.status === "wishlist" ? { background: "var(--wish)" } : undefined
                }
                onClick={() => setEntryStatus(popupMeta.id, "wishlist")}
              >
                <Star className="h-4 w-4" /> Wishlist
              </button>
              <button
                className="flex flex-col items-center gap-1 rounded-xl border border-border px-2 py-2 text-[11px] font-semibold text-muted-foreground transition hover:border-destructive/60 hover:text-destructive"
                onClick={() => setEntryStatus(popupMeta.id, "none")}
              >
                <X className="h-4 w-4" /> Clear
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <button
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                onClick={() => {
                  engineRef.current?.focusCountry(popupMeta.id, mapPadding());
                  engineRef.current?.pulseCountry(popupMeta.id);
                }}
              >
                <MapPin className="h-3.5 w-3.5" /> Zoom in
              </button>
              <button
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-glow transition hover:bg-accent"
                onClick={() => {
                  bus.emit("openDetail", { id: popupMeta.id });
                  setPopup(null);
                }}
              >
                <Sparkles className="h-3.5 w-3.5" /> Details
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* zoom controls */}
      <div className="map-controls">
        <button onClick={() => engineRef.current?.zoomBy(1)} aria-label="Zoom in" title="Zoom in">
          <Plus className="h-4 w-4" />
        </button>
        <button onClick={() => engineRef.current?.zoomBy(-1)} aria-label="Zoom out" title="Zoom out">
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={() => engineRef.current?.resetView()}
          aria-label="Reset world view"
          title="World view"
        >
          <Globe2 className="h-4 w-4" />
        </button>
      </div>

      {/* loading veil */}
      {busy && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-[840] flex justify-center">
          <div className="glass-panel flex items-center gap-3 rounded-full px-5 py-2.5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-glow" />
            <span className="font-medium">Waking up the planet…</span>
            <div className="loading-shimmer h-1 w-24 overflow-hidden rounded-full bg-border" />
          </div>
        </div>
      )}

      {/* engine failure banner */}
      <AnimatePresence>
        {engineError && (
          <motion.div
            key="engine-error"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="absolute inset-x-4 top-20 z-[900] mx-auto max-w-md md:left-[420px] md:right-16 md:mx-0"
          >
            <div className="glass-panel rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-destructive/15 p-2 text-destructive">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">Google Maps could not start</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {engineError}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => useAtlas.getState().setProvider("open")}
                      className="h-8"
                    >
                      Use Open Basemap
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => bus.emit("openSettings", undefined)}
                    >
                      Open map settings
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export type { Pt };
