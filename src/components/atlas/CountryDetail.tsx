"use client";

/**
 * Country detail dialog — years visited, rating, notes and quick facts.
 */

import { useMemo, useState } from "react";
import { Check, MapPin, Plus, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { BY_ID } from "@/lib/atlas";
import { bus } from "@/lib/bus";
import { currentYear, fmtArea, fmtCompact } from "@/lib/format";
import { useAtlas } from "@/lib/store";
import { FlagImg } from "@/components/atlas/bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CountryDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const entry = useAtlas((s) => (id ? s.entries[id] : undefined));
  const addYear = useAtlas((s) => s.addYear);
  const removeYear = useAtlas((s) => s.removeYear);
  const setRating = useAtlas((s) => s.setRating);
  const setNotes = useAtlas((s) => s.setNotes);
  const setStatus = useAtlas((s) => s.setStatus);

  const meta = id ? BY_ID[id] : null;
  const open = Boolean(meta);

  const [yearDraft, setYearDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState(entry?.notes ?? "");
  const [notesDirty, setNotesDirty] = useState(false);

  const facts = useMemo(() => {
    if (!meta) return [];
    const out: [string, string][] = [
      ["Continent", meta.continent],
      ["Region", meta.subregion || "—"],
      ["Area", fmtArea(meta.area)],
      ["Population", meta.pop > 0 ? fmtCompact(meta.pop) : "Uninhabited"],
      ["Type", meta.un ? "Sovereign country" : "Territory / special region"],
    ];
    return out;
  }, [meta]);

  if (!meta) return null;
  const status = entry?.status ?? "none";

  const saveNotes = () => {
    if (id && notesDirty) {
      setNotes(id, notesDraft);
      setNotesDirty(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl border-border bg-popover/95 p-0 backdrop-blur-xl">
        {/* header */}
        <div className="relative overflow-hidden px-5 pb-4 pt-5">
          <div
            className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full opacity-20 blur-3xl"
            style={{ background: status === "wishlist" ? "var(--wish)" : "var(--glow)" }}
          />
          <div className="flex items-start gap-4">
            <FlagImg iso2={meta.iso2} name={meta.name} w={80} className="h-[48px] w-[64px] rounded-lg border border-border/60 shadow-lg" />
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-display truncate text-xl font-bold leading-tight">
                {meta.name}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                {meta.subregion ? `${meta.subregion} · ` : ""}
                {meta.continent}
              </DialogDescription>
              <button
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-glow hover:underline"
                onClick={() => {
                  bus.emit("focus", { id: meta.id });
                  onClose();
                }}
              >
                <MapPin className="h-3 w-3" /> Find on map
              </button>
            </div>
          </div>
        </div>

        {/* status segmented */}
        <div className="px-5">
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                ["none", "Not visited", X],
                ["visited", "Visited", Check],
                ["wishlist", "Wishlist", Star],
              ] as const
            ).map(([st, label, Icon]) => {
              const active = status === st;
              const bg =
                st === "visited" ? "var(--glow)" : st === "wishlist" ? "var(--wish)" : undefined;
              return (
                <button
                  key={st}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-semibold transition",
                    active ? "border-transparent text-black" : "border-border text-muted-foreground hover:border-glow/50 hover:text-foreground"
                  )}
                  style={active ? { background: bg } : undefined}
                  onClick={() => {
                    setStatus(meta.id, st);
                    if (st === "visited") toast(`${meta.name} lit up`);
                    if (st === "wishlist") toast(`${meta.name} saved to wishlist`);
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* years */}
        <div className="px-5 pt-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Years visited
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(entry?.years ?? []).map((y) => (
              <span
                key={y}
                className="group flex items-center gap-1 rounded-full border border-glow/40 bg-glow/10 px-2.5 py-1 font-display text-xs font-semibold text-glow"
              >
                {y}
                <button
                  className="rounded-full p-0.5 text-glow/60 hover:bg-glow/20 hover:text-glow"
                  aria-label={`Remove ${y}`}
                  onClick={() => id && removeYear(id, y)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <Input
                value={yearDraft}
                inputMode="numeric"
                placeholder={`${currentYear()}`}
                className="h-8 w-20 rounded-lg bg-background/60 text-xs"
                onChange={(e) => setYearDraft(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && id) {
                    const y = parseInt(yearDraft || String(currentYear()), 10);
                    if (y >= 1900 && y <= currentYear() + 5) {
                      if (status === "none") setStatus(id, "visited");
                      addYear(id, y);
                      setYearDraft("");
                    }
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 rounded-lg p-0"
                disabled={status === "none"}
                aria-label="Add year"
                onClick={() => {
                  if (!id) return;
                  const y = parseInt(yearDraft || String(currentYear()), 10);
                  if (y >= 1900 && y <= currentYear() + 5) {
                    addYear(id, y);
                    setYearDraft("");
                  }
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {status === "none" && (
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Mark the country as visited to start adding years.
            </p>
          )}
        </div>

        {/* rating */}
        <div className="px-5 pt-4">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            How much you loved it
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className="star-btn"
                aria-label={`Rate ${n} of 5`}
                onClick={() => id && setRating(id, entry?.rating === n ? 0 : n)}
              >
                <Star
                  className={cn(
                    "h-6 w-6",
                    (entry?.rating ?? 0) >= n ? "fill-wish text-wish" : "text-muted-foreground/40"
                  )}
                />
              </button>
            ))}
            {entry?.rating ? (
              <button
                className="ml-2 flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                onClick={() => id && setRating(id, 0)}
              >
                <Trash2 className="h-3 w-3" /> reset
              </button>
            ) : null}
          </div>
        </div>

        {/* notes */}
        <div className="px-5 pt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Travel notes
            </span>
            {notesDirty && (
              <button
                className="rounded-md bg-glow/15 px-2 py-0.5 text-[10px] font-bold text-glow"
                onClick={saveNotes}
              >
                Save
              </button>
            )}
          </div>
          <textarea
            value={notesDraft}
            onChange={(e) => {
              setNotesDraft(e.target.value);
              setNotesDirty(true);
            }}
            onBlur={saveNotes}
            placeholder="Best meal, hidden gem, the thing you'd tell a friend…"
            rows={3}
            className="nice-scroll w-full resize-none rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-glow/60"
          />
        </div>

        {/* facts */}
        <div className="mt-4 border-t border-border/70 bg-card/40 px-5 py-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {facts.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {k}
                </div>
                <div className="truncate text-xs font-medium">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
