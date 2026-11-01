"use client";

/**
 * Settings — map engine (Google Maps / open basemap), themes, accent,
 * profile and data management.
 */

import { useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  Info,
  KeyRound,
  Map as MapIcon,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { computeStats } from "@/lib/atlas";
import { exportCsv, exportJson, parseBackupFile } from "@/lib/export";
import { MAP_THEMES, THEME_IDS } from "@/lib/colors";
import { fmtPct } from "@/lib/format";
import { useAtlas } from "@/lib/store";
import { SectionTitle } from "@/components/atlas/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const ENV_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export function SettingsTab() {
  const s = useAtlas();
  const stats = useMemo(() => computeStats(s.entries), [s.entries]);
  const [keyDraft, setKeyDraft] = useState(s.googleKey);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeKey = s.googleKey || ENV_KEY;

  return (
    <div className="space-y-6 px-4 pb-10 pt-4 md:px-5">
      {/* profile */}
      <section>
        <SectionTitle>Explorer profile</SectionTitle>
        <div className="rounded-2xl border border-border bg-card/70 p-4">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="explorer-name">
            Display name (shown on your share card)
          </label>
          <Input
            id="explorer-name"
            value={s.profileName}
            onChange={(e) => s.setProfileName(e.target.value)}
            placeholder="Anonymous Explorer"
            className="mt-1.5 h-10 rounded-xl bg-background/60"
            maxLength={40}
          />
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-xs font-semibold">Quick-tap mode</div>
              <div className="text-[11px] text-muted-foreground">
                Clicking a country instantly toggles it
              </div>
            </div>
            <Switch checked={s.quickMode} onCheckedChange={s.setQuickMode} />
          </div>
        </div>
      </section>

      {/* map engine */}
      <section>
        <SectionTitle>Map engine</SectionTitle>
        <div className="space-y-2.5">
          {/* Google Maps */}
          <div
            className={cn(
              "rounded-2xl border p-4 transition",
              s.provider === "google" ? "border-glow/60 bg-glow/[0.06]" : "border-border bg-card/70"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#4285F4]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#8ab4f8]">
                    Google
                  </span>
                  Maps <span className="font-normal text-muted-foreground">· recommended</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Official Google Maps JS API with styled basemaps. Needs a free API key.
                </p>
              </div>
              {s.provider === "google" && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-glow/15 px-2 py-0.5 text-[10px] font-bold text-glow">
                  <Check className="h-3 w-3" /> ACTIVE
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder={activeKey ? "••••• key stored •••••" : "AIza… paste your API key"}
                  className="h-9 rounded-xl bg-background/60 pl-9 font-mono text-xs"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="h-8"
                  disabled={keyDraft.trim().length < 20}
                  onClick={() => {
                    s.setGoogleKey(keyDraft.trim());
                    s.setProvider("google");
                    toast.info("Switching to Google Maps…");
                  }}
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Save key & use Google Maps
                </Button>
                <a
                  href="https://console.cloud.google.com/google/maps-apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-medium text-glow hover:underline"
                >
                  Get a free key <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                Enable “Maps JavaScript API”. Keys stay in your browser (localStorage). For
                production, restrict the key to your domain — Google&apos;s monthly free credit
                comfortably covers personal use.
              </p>
            </div>
          </div>

          {/* Open basemap */}
          <button
            type="button"
            className={cn(
              "w-full rounded-2xl border p-4 text-left transition",
              s.provider === "open" ? "border-glow/60 bg-glow/[0.06]" : "border-border bg-card/70"
            )}
            onClick={() => s.setProvider("open")}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MapIcon className="h-4 w-4 text-glow" />
                  Open Basemap
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    no key
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Beautiful Esri & OpenStreetMap raster tiles — works instantly, zero setup.
                </p>
              </div>
              {s.provider === "open" && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-glow/15 px-2 py-0.5 text-[10px] font-bold text-glow">
                  <Check className="h-3 w-3" /> ACTIVE
                </span>
              )}
            </div>
          </button>
        </div>
      </section>

      {/* map theme */}
      <section>
        <SectionTitle>Map style</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          {THEME_IDS.map((id) => {
            const t = MAP_THEMES[id];
            const active = s.theme === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => s.setTheme(id)}
                className={cn(
                  "overflow-hidden rounded-xl border text-left transition",
                  active ? "border-glow/70" : "border-border hover:border-glow/40"
                )}
              >
                <div className="h-14 w-full" style={{ background: t.preview }} />
                <div className="px-2.5 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{t.label}</span>
                    {active && <Check className="h-3.5 w-3.5 text-glow" />}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">{t.blurb}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* data */}
      <section>
        <SectionTitle>Your data — stored only on this device</SectionTitle>
        <div className="space-y-2 rounded-2xl border border-border bg-card/70 p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                exportJson();
                toast.success("Backup downloaded");
              }}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> JSON backup
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Restore backup
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 col-span-2"
              onClick={() => {
                exportCsv();
                toast.success("CSV exported");
              }}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                try {
                  const data = await parseBackupFile(f);
                  s.importData(data);
                  toast.success("Backup restored — your map is glowing again");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not read that file");
                }
              }
              e.target.value = "";
            }}
          />

          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                  <Trash2 className="h-3.5 w-3.5" /> Reset everything
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {stats.visitedIds.length} visited · {stats.wishlistIds.length} wishlist ·{" "}
                  {fmtPct(stats.pctWorld)} of the world
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="h-8">
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Dim the whole planet?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This erases every visited country, wishlist entry, note and rating stored in
                      this browser. Download a JSON backup first if you might regret it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep my map</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={() => {
                        s.clearAll();
                        toast("Map cleared — the world awaits again");
                      }}
                    >
                      Erase everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </section>

      {/* about */}
      <section className="space-y-2 rounded-2xl border border-border/60 bg-card/40 p-4 text-[11px] leading-relaxed text-muted-foreground">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <FileJson className="h-3.5 w-3.5" /> About GlowAtlas v1.0
        </div>
        <p>
          Country boundaries from Natural Earth (50m). Names, UN membership, population &amp; area
          from the mledoze/countries dataset. Basemaps: Google Maps (with your key) or Esri /
          OpenStreetMap. Flags via flagcdn.
        </p>
      </section>
    </div>
  );
}
