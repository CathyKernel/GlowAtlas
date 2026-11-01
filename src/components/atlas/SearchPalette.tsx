"use client";

/**
 * Spotlight search (cmdk) — jump to any country, plus quick actions.
 */

import { useEffect, useMemo, useState } from "react";
import { Check, Command, Globe2, Search, Star } from "lucide-react";

import { COUNTRIES_META, flagEmoji } from "@/lib/atlas";
import { bus } from "@/lib/bus";
import { useAtlas } from "@/lib/store";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function SearchPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const entries = useAtlas((s) => s.entries);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const off = bus.on("openSearch", () => setOpen(true));
    return () => {
      off();
    };
  }, [setOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = COUNTRIES_META.filter((m) => {
      if (!q) return entries[m.id]?.status === "visited";
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.iso2 ?? "").toLowerCase() === q
      );
    });
    return base.slice(0, q ? 24 : 12);
  }, [query, entries]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery("");
      }}
    >
      <CommandInput placeholder="Search countries, territories…" value={query} onValueChange={setQuery} />
      <CommandList className="nice-scroll">
        <CommandEmpty>No places match “{query}”.</CommandEmpty>

        <CommandGroup heading={query ? "Places" : "Recently glowing"}>
          {results.map((m) => {
            const st = entries[m.id]?.status;
            return (
              <CommandItem
                key={m.id}
                value={`${m.name} ${m.id} ${m.iso2 ?? ""}`}
                onSelect={() => {
                  bus.emit("focus", { id: m.id });
                  setOpen(false);
                }}
              >
                <span className="w-5 text-center text-sm">{flagEmoji(m.iso2)}</span>
                <span className="flex-1 truncate">{m.name}</span>
                <span className="text-[10px] text-muted-foreground">{m.continent}</span>
                {st === "visited" && <Check className="h-3.5 w-3.5 text-glow" />}
                {st === "wishlist" && <Star className="h-3.5 w-3.5 text-wish" />}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              bus.emit("openShare", undefined);
            }}
          >
            <Globe2 className="h-4 w-4" />
            <span>Share my stats card</span>
          </CommandItem>
        </CommandGroup>

        <div className="flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" /> + Enter to jump
          </span>
          <span>Press Esc to close</span>
        </div>
      </CommandList>
    </CommandDialog>
  );
}
