"use client";

/**
 * Countries — searchable, filterable, sortable list of every markable place.
 */

import { useDeferredValue, useMemo, useState } from "react";
import { ArrowDownWideNarrow, Check, ListFilter, Search, Star, X } from "lucide-react";

import { COUNTRIES_META } from "@/lib/atlas";
import { bus } from "@/lib/bus";
import { fmtCompact } from "@/lib/format";
import { useAtlas } from "@/lib/store";
import { FlagImg, StatusControl } from "@/components/atlas/bits";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "visited" | "wishlist" | "none";
type SortKey = "name" | "pop" | "area" | "recent";

const STATUS_CHIPS: { id: StatusFilter; label: string; icon?: typeof Check }[] = [
  { id: "all", label: "All" },
  { id: "visited", label: "Visited", icon: Check },
  { id: "wishlist", label: "Wishlist", icon: Star },
  { id: "none", label: "Not yet", icon: X },
];

export function CountriesTab() {
  const entries = useAtlas((s) => s.entries);
  const setStatus = useAtlas((s) => s.setStatus);

  const [query, setQuery] = useState("");
  const [status, setStatusFilter] = useState<StatusFilter>("all");
  const [continent, setContinent] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("name");

  const deferredQuery = useDeferredValue(query);

  const continents = useMemo(() => {
    const set = new Map<string, number>();
    for (const m of COUNTRIES_META) set.set(m.continent, (set.get(m.continent) ?? 0) + 1);
    return [...set.entries()].sort((a, b) => b[1] - a[1]);
  }, []);

  const counts = useMemo(() => {
    let visited = 0,
      wishlist = 0;
    for (const e of Object.values(entries)) {
      if (e.status === "visited") visited++;
      else if (e.status === "wishlist") wishlist++;
    }
    return { visited, wishlist, none: COUNTRIES_META.length - visited - wishlist };
  }, [entries]);

  const list = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    let out = COUNTRIES_META.filter((m) => {
      if (continent !== "all" && m.continent !== continent) return false;
      const st = entries[m.id]?.status ?? "none";
      if (status !== "all" && st !== status) return false;
      if (q && !m.name.toLowerCase().includes(q) && !m.id.toLowerCase().includes(q)) return false;
      return true;
    });
    out = out.sort((a, b) => {
      switch (sort) {
        case "pop":
          return b.pop - a.pop;
        case "area":
          return b.area - a.area;
        case "recent":
          return (entries[b.id]?.updatedAt ?? 0) - (entries[a.id]?.updatedAt ?? 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return out;
  }, [deferredQuery, status, continent, sort, entries]);

  return (
    <div className="flex h-full flex-col">
      {/* search + filters */}
      <div className="space-y-2.5 px-4 pb-3 pt-4 md:px-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 252 countries & territories…"
            className="h-10 rounded-xl bg-card/70 pl-9 pr-9"
            aria-label="Search countries"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_CHIPS.map((c) => {
            const active = status === c.id;
            const count =
              c.id === "all" ? COUNTRIES_META.length : counts[c.id as keyof typeof counts];
            return (
              <button
                key={c.id}
                onClick={() => setStatusFilter(c.id)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                  active
                    ? "border-glow/70 bg-glow/15 text-glow"
                    : "border-border text-muted-foreground hover:border-glow/40 hover:text-foreground"
                )}
              >
                {c.icon && <c.icon className="h-3 w-3" />}
                {c.label}
                <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <ListFilter className="h-3.5 w-3.5 shrink-0" />
            <select
              value={continent}
              onChange={(e) => setContinent(e.target.value)}
              className="h-8 max-w-[190px] truncate rounded-lg border border-border bg-card/70 px-2 text-xs text-foreground outline-none focus:border-glow/60"
              aria-label="Filter by continent"
            >
              <option value="all">All continents</option>
              {continents.map(([name, n]) => (
                <option key={name} value={name}>
                  {name} ({n})
                </option>
              ))}
            </select>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-xs">
                <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                {sort === "name" && "A–Z"}
                {sort === "pop" && "Population"}
                {sort === "area" && "Area"}
                {sort === "recent" && "Recent"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setSort("name")}>Name A–Z</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("pop")}>Population</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("area")}>Area</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("recent")}>Recently changed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* list */}
      <div className="nice-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-8 md:px-4" role="list">
        {list.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No countries match these filters.
          </div>
        )}
        {list.map((m) => {
          const e = entries[m.id];
          return (
            <div
              key={m.id}
              role="listitem"
              className={cn(
                "group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-card",
                e?.status === "visited" && "bg-glow/[0.06]",
                e?.status === "wishlist" && "bg-wish/[0.06]"
              )}
              onClick={() => bus.emit("openDetail", { id: m.id })}
            >
              <FlagImg iso2={m.iso2} name={m.name} w={32} className="h-5 w-7 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-medium">{m.name}</span>
                  {!m.un && (
                    <span className="shrink-0 rounded-sm border border-border px-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      T
                    </span>
                  )}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {m.continent}
                  {m.pop > 0 && ` · ${fmtCompact(m.pop)}`}
                  {e?.years?.length ? ` · ${e.years.join(", ")}` : ""}
                </div>
              </div>
              <StatusControl
                status={e?.status ?? "none"}
                size="sm"
                onChange={(s) => setStatus(m.id, s)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
