"use client";

/**
 * Dashboard — the flight-app-style stats overview.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Compass, Globe2, Landmark, Map, TrendingUp, Users } from "lucide-react";

import { BY_ID, computeStats, levelFor, nextLevelFor } from "@/lib/atlas";
import { bus } from "@/lib/bus";
import { fmtArea, fmtCompact, fmtPct } from "@/lib/format";
import { useAtlas } from "@/lib/store";
import { Bar, CountUp, FlagImg, ProgressRing, SectionTitle } from "@/components/atlas/bits";

export function DashboardTab() {
  const entries = useAtlas((s) => s.entries);
  const profileName = useAtlas((s) => s.profileName);

  const stats = useMemo(() => computeStats(entries), [entries]);
  const { level } = levelFor(stats.visitedCountries);
  const next = nextLevelFor(stats.visitedCountries);

  const isEmpty = stats.visitedIds.length === 0 && stats.wishlistIds.length === 0;

  if (isEmpty) {
    return (
      <div className="relative flex flex-col items-center px-6 py-12 text-center">
        <div className="cover-dots pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mb-5">
          <div className="glow-dot absolute -inset-7 rounded-full bg-glow/10 blur-2xl" />
          <div className="rounded-3xl border border-glow/25 bg-black/60 p-5 shadow-[0_0_36px_-6px_rgba(250,204,21,0.35)]">
            <Globe2 className="h-12 w-12 text-glow" strokeWidth={1.4} />
          </div>
        </div>
        <h2 className="font-display cover-title text-2xl font-bold">Your map is waiting</h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
          Tap any country on the map to light it up in gold. Build your timeline, wishlist and
          stats as you go — everything is saved on this device.
        </p>
        <div className="relative mt-6 flex items-center gap-2 rounded-full border border-border bg-black/50 px-4 py-1.5 text-[11px] font-medium text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-glow shadow-[0_0_8px_var(--glow)]" />
          195 countries · 7 continents · 1 golden map
        </div>
      </div>
    );
  }

  const tiles = [
    {
      icon: TrendingUp,
      label: "Share of the world",
      value: fmtPct(stats.pctWorld),
      sub: `${stats.visitedCountries} of ${stats.worldCountries} countries`,
    },
    {
      icon: Map,
      label: "Land covered",
      value: fmtPct(stats.landPct),
      sub: fmtArea(stats.landKm2),
    },
    {
      icon: Users,
      label: "Population reach",
      value: fmtPct(stats.popPct),
      sub: `${fmtCompact(stats.popReach)} people`,
    },
    {
      icon: Landmark,
      label: "Territories & wishlist",
      value: `${stats.visitedTerritories} · ${stats.wishlistIds.length}`,
      sub: "visited territories · wishlist",
    },
  ];

  return (
    <div className="space-y-6 px-4 pb-8 pt-4 md:px-5">
      {/* hero */}
      <section className="glass-soft relative overflow-hidden rounded-2xl p-5">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--glow)" }}
        />
        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
          <ProgressRing ratio={stats.pctWorld} size={132}>
            <div className="text-center leading-none">
              <CountUp
                value={stats.visitedCountries}
                className="font-display text-[34px] font-bold text-glow"
              />
              <div className="mt-1 font-display text-sm font-medium text-muted-foreground">
                / {stats.worldCountries}
              </div>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {profileName ? `${profileName} · countries visited` : "Countries visited"}
            </div>
            <h2 className="font-display mt-1.5 text-2xl font-bold leading-tight">
              {level.title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{level.blurb}</p>
            {next && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Next: {next.title}</span>
                  <span>
                    {stats.visitedCountries}/{next.min}
                  </span>
                </div>
                <Bar ratio={stats.visitedCountries / next.min} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* stat tiles */}
      <section className="grid grid-cols-2 gap-2.5">
        {tiles.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="rounded-xl border border-border bg-card/70 p-3"
          >
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <t.icon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">{t.label}</span>
            </div>
            <div className="font-display mt-1.5 text-lg font-bold">{t.value}</div>
            <div className="truncate text-[11px] text-muted-foreground">{t.sub}</div>
          </motion.div>
        ))}
      </section>

      {/* continents */}
      <section>
        <SectionTitle right={<span className="text-[11px] text-muted-foreground">countries</span>}>
          Continents
        </SectionTitle>
        <div className="space-y-3 rounded-2xl border border-border bg-card/70 p-4">
          {stats.continents.map((c) => (
            <div key={c.name}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{c.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-semibold" style={{ color: c.color }}>
                    {c.visited - c.visitedTerritories}
                  </span>
                  {c.visitedTerritories > 0 && (
                    <span className="text-wish">+{c.visitedTerritories}t</span>
                  )}{" "}
                  / {c.countries}
                </span>
              </div>
              <Bar ratio={c.countries ? (c.visited - c.visitedTerritories) / c.countries : 0} color={c.color} height={5} />
            </div>
          ))}
        </div>
      </section>

      {/* recently lit */}
      {stats.recentIds.length > 0 && (
        <section>
          <SectionTitle>Recently lit</SectionTitle>
          <div className="grid grid-cols-1 gap-1.5">
            {stats.recentIds.map((id) => {
              const m = BY_ID[id];
              const e = entries[id];
              if (!m) return null;
              return (
                <button
                  key={id}
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/50 px-3 py-2 text-left transition hover:border-glow/50 hover:bg-card"
                  onClick={() => bus.emit("openDetail", { id })}
                >
                  <FlagImg iso2={m.iso2} name={m.name} w={24} className="h-4 w-6 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.name}</span>
                  {e?.years?.length ? (
                    <span className="font-display text-[11px] tabular-nums text-muted-foreground">
                      {e.years[e.years.length - 1]}
                    </span>
                  ) : null}
                  {e?.rating ? (
                    <span className="text-[11px] text-wish">{"★".repeat(e.rating)}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* footer note */}
      <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-muted-foreground/70">
        <Compass className="h-3 w-3" />
        Counting follows the travel-app convention of 195 countries
        (193 UN members + Vatican + Palestine).
      </div>
    </div>
  );
}
