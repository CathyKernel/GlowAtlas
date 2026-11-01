"use client";

/**
 * Timeline — visited countries grouped by year, newest first.
 */

import { useMemo } from "react";
import { CalendarDays, Compass, Star } from "lucide-react";

import { BY_ID, computeStats } from "@/lib/atlas";
import { bus } from "@/lib/bus";
import { useAtlas } from "@/lib/store";
import { FlagImg, SectionTitle } from "@/components/atlas/bits";

export function TimelineTab() {
  const entries = useAtlas((s) => s.entries);
  const stats = useMemo(() => computeStats(entries), [entries]);

  const hasDated = stats.yearGroups.length > 0;
  const span =
    stats.earliestYear && stats.yearGroups.length
      ? new Date().getFullYear() - stats.earliestYear + 1
      : 0;

  if (!hasDated && stats.undatedIds.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <CalendarDays className="mb-4 h-10 w-10 text-muted-foreground/60" strokeWidth={1.5} />
        <h2 className="font-display text-lg font-semibold">No travel history yet</h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
          Open a country&apos;s details to add the years you visited. Your journeys will stack up
          here as a glowing timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pb-8 pt-4 md:px-5">
      {hasDated && (
        <div className="glass-soft flex items-center gap-4 rounded-2xl p-4">
          <div className="rounded-xl bg-glow/15 p-2.5 text-glow">
            <Compass className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg font-bold leading-tight">
              Traveling since {stats.earliestYear}
            </div>
            <div className="text-xs text-muted-foreground">
              {span} {span === 1 ? "year" : "years"} of journeys ·{" "}
              {stats.yearGroups.reduce((s, g) => s + g.ids.length, 0)} marked visits
              {stats.ratingAvg > 0 && ` · ★ ${stats.ratingAvg.toFixed(1)} avg`}
            </div>
          </div>
        </div>
      )}

      {stats.yearGroups.map((g) => (
        <section key={g.year}>
          <SectionTitle
            right={
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {g.ids.length} {g.ids.length === 1 ? "country" : "countries"}
              </span>
            }
          >
            {g.year}
          </SectionTitle>
          <div className="relative rounded-2xl border border-border bg-card/70 p-3">
            <div
              className="absolute bottom-3 top-3 left-0 w-[3px] rounded-full"
              style={{
                background: "linear-gradient(to bottom, var(--glow), transparent)",
                marginLeft: 14,
              }}
            />
            <div className="grid grid-cols-1 gap-1">
              {g.ids
                .map((id) => ({ id, m: BY_ID[id], e: entries[id] }))
                .filter((x) => x.m)
                .sort((a, b) => a.m.name.localeCompare(b.m.name))
                .map(({ id, m, e }) => (
                  <button
                    key={id}
                    className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-accent/60"
                    onClick={() => bus.emit("openDetail", { id })}
                  >
                    <FlagImg iso2={m.iso2} name={m.name} w={28} className="h-[18px] w-[26px] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{m.name}</div>
                      {e?.notes && (
                        <div className="truncate text-[11px] italic text-muted-foreground">
                          “{e.notes}”
                        </div>
                      )}
                    </div>
                    {e?.rating ? (
                      <span className="shrink-0 text-[11px] text-wish" title={`${e.rating}/5`}>
                        <Star className="h-3 w-3 fill-current" />
                        <span className="ml-0.5 tabular-nums">{e.rating}</span>
                      </span>
                    ) : null}
                  </button>
                ))}
            </div>
          </div>
        </section>
      ))}

      {stats.undatedIds.length > 0 && (
        <section>
          <SectionTitle
            right={
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {stats.undatedIds.length}
              </span>
            }
          >
            Undated visits
          </SectionTitle>
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-dashed border-border bg-card/40 p-3">
            {stats.undatedIds
              .map((id) => ({ id, m: BY_ID[id] }))
              .filter((x) => x.m)
              .map(({ id, m }) => (
                <button
                  key={id}
                  className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium transition hover:border-glow/60 hover:text-glow"
                  onClick={() => bus.emit("openDetail", { id })}
                >
                  <FlagImg iso2={m.iso2} name={m.name} w={20} className="h-[12px] w-[16px]" />
                  {m.name}
                </button>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
