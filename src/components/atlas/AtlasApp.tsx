"use client";

/**
 * AtlasApp — composition root: map + sidebar + dialogs + onboarding.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Drawer } from "vaul";
import { toast } from "sonner";

import { computeStats, levelFor } from "@/lib/atlas";
import { bus } from "@/lib/bus";
import { ACCENTS, WISH } from "@/lib/colors";
import { useAtlas } from "@/lib/store";
import { withBase } from "@/lib/utils";
import MapView from "@/components/map/MapView";
import { Sidebar, MobileTabBar, type TabId } from "@/components/atlas/Sidebar";
import { CountryDetail } from "@/components/atlas/CountryDetail";
import { Onboarding } from "@/components/atlas/Onboarding";
import { SearchPalette } from "@/components/atlas/SearchPalette";
import { ShareCard } from "@/components/atlas/ShareCard";

export default function AtlasApp() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const onboarded = useAtlas((s) => s.onboarded);
  const entries = useAtlas((s) => s.entries);
  const accent = useAtlas((s) => s.accent);
  const provider = useAtlas((s) => s.provider);
  const theme = useAtlas((s) => s.theme);

  /* mounted gate — avoids SSR/localStorage hydration mismatches */
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  /* live accent CSS variable */
  useEffect(() => {
    const spec = ACCENTS[accent] ?? ACCENTS.gold;
    document.documentElement.style.setProperty("--glow", spec.hex);
    document.documentElement.style.setProperty("--wish", WISH.hex);
  }, [accent]);

  /* bus wiring */
  useEffect(() => {
    const offs = [
      bus.on("openDetail", ({ id }) => setDetailId(id)),
      bus.on("openSearch", () => setSearchOpen(true)),
      bus.on("openShare", () => setShareOpen(true)),
      bus.on("openSettings", () => {
        setTab("settings");
        setDrawerOpen(true);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  /* level-up detection across all mutation paths */
  const prevLevel = useRef<number | null>(null);
  const stats = computeStats(entries);
  useEffect(() => {
    if (!mounted) return;
    const { index } = levelFor(stats.visitedCountries);
    if (prevLevel.current !== null && index > prevLevel.current) {
      const { level } = levelFor(stats.visitedCountries);
      toast.success(`Level up — ${level.title}!`, {
        description: level.blurb,
        duration: 5000,
      });
    }
    prevLevel.current = index;
  }, [stats.visitedCountries, mounted]);

  /* provider badge label */
  const providerLabel =
    provider === "google" ? "Google Maps" : theme === "midnight" ? "Blackout · open basemap" : "Open Basemap";

  if (!mounted) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.98, 1.02, 0.98] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="flex flex-col items-center gap-3"
        >
          <img src={withBase("/glowatlas.svg")} alt="" className="h-16 w-16 rounded-2xl shadow-2xl" />
          <div className="font-display text-lg font-semibold tracking-tight">GlowAtlas</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      {/* map (both engines mount here) */}
      <MapView />

      {/* desktop sidebar */}
      <aside className="glass-panel absolute bottom-3 left-3 top-3 z-[820] hidden w-[380px] rounded-2xl lg:block xl:w-[400px]">
        <Sidebar tab={tab} setTab={setTab} />
      </aside>

      {/* mobile top bar */}
      <div className="glass-panel absolute inset-x-3 top-3 z-[820] flex items-center gap-2.5 rounded-2xl px-3 py-2 lg:hidden">
        <img src={withBase("/glowatlas.svg")} alt="" className="h-8 w-8 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-bold leading-none">GlowAtlas</div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-glow">
            {stats.visitedCountries}/195 · {providerLabel}
          </div>
        </div>
        <button
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/70 text-muted-foreground"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
        <button
          onClick={() => setShareOpen(true)}
          aria-label="Share stats"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/70 text-muted-foreground"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
          </svg>
        </button>
      </div>

      {/* mobile bottom sheet */}
      <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen} shouldScaleBackground>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[890] bg-black/50" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[895] mx-auto max-h-[86dvh] rounded-t-2xl border-t border-border bg-popover/95 outline-none backdrop-blur-xl">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/40" />
            <div className="nice-scroll h-[72dvh] overflow-y-auto pb-6">
              <Sidebar tab={tab} setTab={setTab} />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <MobileTabBar tab={tab} setTab={setTab} open={drawerOpen} setOpen={setDrawerOpen} />

      {/* legend */}
      <Legend visited={stats.visitedIds.length} wishlist={stats.wishlistIds.length} />

      {/* overlays */}
      <SearchPalette open={searchOpen} setOpen={setSearchOpen} />
      <ShareCard open={shareOpen} onClose={() => setShareOpen(false)} />
      <CountryDetail key={detailId ?? "none"} id={detailId} onClose={() => setDetailId(null)} />
      <AnimatePresence>
        {!onboarded && <Onboarding />}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Legend                                                              */
/* ------------------------------------------------------------------ */

function Legend({ visited, wishlist }: { visited: number; wishlist: number }) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="glass-panel absolute bottom-[86px] left-3 z-[830] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold text-muted-foreground lg:bottom-6"
      >
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--glow)" }} />
        Legend
      </button>
    );
  }

  return (
    <div className="glass-panel absolute bottom-[86px] left-3 z-[830] flex items-center gap-3 rounded-full px-3.5 py-1.5 text-[10px] font-semibold lg:bottom-6">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--glow)" }} />
        <span className="text-foreground">Visited</span>
        <span className="tabular-nums text-glow">{visited}</span>
      </span>
      <span className="h-3 w-px bg-border" />
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--wish)" }} />
        <span className="text-foreground">Wishlist</span>
        <span className="tabular-nums text-wish">{wishlist}</span>
      </span>
      <span className="h-3 w-px bg-border" />
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
        <span className="text-muted-foreground">Not yet</span>
      </span>
      <button
        onClick={() => setCollapsed(true)}
        aria-label="Collapse legend"
        className="ml-0.5 text-muted-foreground/70 hover:text-foreground"
      >
        –
      </button>
    </div>
  );
}
