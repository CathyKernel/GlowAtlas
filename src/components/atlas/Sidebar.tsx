"use client";

/**
 * Sidebar shell — fixed glass rail on desktop, swipeable bottom sheet on
 * mobile. Both share the exact same tab content.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, ListOrdered, Map as MapIcon, Search, Settings2, Share2, SlidersHorizontal } from "lucide-react";

import { computeStats } from "@/lib/atlas";
import { bus } from "@/lib/bus";
import { useAtlas } from "@/lib/store";
import { DashboardTab } from "@/components/atlas/DashboardTab";
import { CountriesTab } from "@/components/atlas/CountriesTab";
import { TimelineTab } from "@/components/atlas/TimelineTab";
import { SettingsTab } from "@/components/atlas/SettingsTab";
import { cn, withBase } from "@/lib/utils";

export type TabId = "dashboard" | "countries" | "timeline" | "settings";

const TABS: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
  { id: "dashboard", label: "Stats", icon: BarChart3 },
  { id: "countries", label: "Countries", icon: ListOrdered },
  { id: "timeline", label: "Timeline", icon: MapIcon },
  { id: "settings", label: "Settings", icon: SlidersHorizontal },
];

export function Sidebar({
  tab,
  setTab,
  children,
}: {
  tab: TabId;
  setTab: (t: TabId) => void;
  children?: React.ReactNode;
}) {
  const entries = useAtlas((s) => s.entries);
  const stats = computeStats(entries);

  return (
    <div className="flex h-full flex-col">
      {/* brand header */}
      <div className="flex items-center gap-3 px-5 pb-3 pt-5">
        <img src={withBase("/glowatlas.svg")} alt="GlowAtlas logo" className="h-9 w-9 rounded-xl shadow-lg" />
        <div className="min-w-0 flex-1">
          <div className="font-display text-[17px] font-bold leading-none tracking-tight">
            GlowAtlas
          </div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Light up the world
          </div>
        </div>
        <div
          className="flex flex-col items-center rounded-xl border px-2.5 py-1.5"
          style={{ borderColor: "color-mix(in oklab, var(--glow) 40%, transparent)" }}
        >
          <span className="font-display text-base font-bold leading-none text-glow">
            {stats.visitedCountries}
          </span>
          <span className="text-[9px] font-semibold text-muted-foreground">/ 195</span>
        </div>
      </div>

      {/* quick actions */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <button
          onClick={() => bus.emit("openSearch", undefined)}
          className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-border bg-card/70 px-3 text-xs font-medium text-muted-foreground transition hover:border-glow/50 hover:text-foreground"
        >
          <Search className="h-3.5 w-3.5" />
          Search countries…
          <kbd className="ml-auto rounded-md border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[9px]">
            /
          </kbd>
        </button>
        <button
          onClick={() => bus.emit("openShare", undefined)}
          aria-label="Share stats card"
          title="Share stats card"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/70 text-muted-foreground transition hover:border-glow/50 hover:text-glow"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* tab bar */}
      <nav className="flex gap-1 px-4 pb-2" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition",
              tab === t.id ? "text-glow" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === t.id && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-xl bg-glow/10"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <t.icon className="relative h-4 w-4" />
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* content */}
      <div className="nice-scroll min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.16 }}
            className={tab === "countries" ? "h-full" : undefined}
          >
            {tab === "dashboard" && <DashboardTab />}
            {tab === "countries" && <CountriesTab />}
            {tab === "timeline" && <TimelineTab />}
            {tab === "settings" && <SettingsTab />}
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile bottom tab launcher                                          */
/* ------------------------------------------------------------------ */

export function MobileTabBar({
  tab,
  setTab,
  open,
  setOpen,
}: {
  tab: TabId;
  setTab: (t: TabId) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  useEffect(() => {
    const off = bus.on("openSettings", () => {
      setTab("settings");
      setOpen(true);
    });
    return () => {
      off();
    };
  }, []);

  return (
    <div className="glass-panel fixed inset-x-0 bottom-0 z-[880] flex items-stretch justify-around rounded-t-2xl px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 lg:hidden">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => {
            setTab(t.id);
            setOpen(open && tab === t.id ? false : true);
          }}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition",
            open && tab === t.id ? "text-glow" : "text-muted-foreground"
          )}
        >
          <t.icon className="h-5 w-5" />
          {t.label}
        </button>
      ))}
    </div>
  );
}
