"use client";

/**
 * First-run cover — jet-black hero with solar-gold branding, name field
 * and map engine choice.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, KeyRound, Map as MapIcon, MousePointerClick, Rocket, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useAtlas } from "@/lib/store";
import { withBase } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Onboarding() {
  const s = useAtlas();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyOpen, setKeyOpen] = useState(false);

  const finish = (provider: "google" | "open") => {
    if (name.trim()) s.setProfileName(name.trim());
    if (provider === "google" && key.trim().length >= 20) {
      s.setGoogleKey(key.trim());
      s.setProvider("google");
    } else {
      s.setProvider("open");
    }
    s.setOnboarded(true);
    toast.success("Welcome to GlowAtlas — tap a country to light it up in gold");
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden bg-black/90 p-4 backdrop-blur-md">
      {/* decorative backdrop: gold halo + dotted grid */}
      <div className="cover-halo pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 opacity-70" />
      <div className="cover-dots pointer-events-none absolute inset-0 opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="glass-panel nice-scroll relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl border-glow/20 bg-black/70 p-6"
      >
        {/* cover header */}
        <div className="relative flex flex-col items-center pt-2 text-center">
          <div className="relative mb-4">
            <div className="glow-dot absolute -inset-5 rounded-full bg-glow/15 blur-xl" />
            <img
              src={withBase("/glowatlas.svg")}
              alt="GlowAtlas logo"
              className="relative h-16 w-16 rounded-2xl shadow-[0_0_36px_-4px_rgba(250,204,21,0.55)]"
            />
          </div>
          <h1 className="font-display cover-title text-[34px] font-bold leading-none tracking-tight">
            GlowAtlas
          </h1>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-glow shadow-[0_0_10px_var(--glow)]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-glow">
              Light up the world
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-glow shadow-[0_0_10px_var(--glow)]" />
          </div>
          <p className="mt-3.5 max-w-[300px] text-xs leading-relaxed text-muted-foreground">
            Mark every country you&apos;ve visited and watch it glow gold on a jet-black map.
          </p>
        </div>

        {/* name */}
        <div className="mt-6">
          <label htmlFor="ob-name" className="text-xs font-semibold text-muted-foreground">
            What should we call you? <span className="font-normal opacity-70">(optional)</span>
          </label>
          <Input
            id="ob-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Anonymous Explorer"
            className="mt-1.5 h-10 rounded-xl bg-black/50"
            maxLength={40}
            autoFocus
          />
        </div>

        {/* engine */}
        <div className="mt-5 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">Choose your map</div>

          <div className="flex items-start gap-3 rounded-2xl border border-glow/50 bg-glow/[0.07] p-4">
            <MapIcon className="mt-0.5 h-4 w-4 shrink-0 text-glow" />
            <div>
              <div className="text-sm font-semibold">
                Open basemap <span className="font-normal text-muted-foreground">· recommended</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Black satellite &amp; street tiles included — no account, no API key, nothing to
                configure.
              </p>
            </div>
          </div>

          <button
            onClick={() => setKeyOpen((v) => !v)}
            className={cn(
              "w-full rounded-2xl border border-dashed border-border p-4 text-left transition hover:border-glow/40",
              keyOpen && "border-glow/60 bg-glow/[0.07]"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#4285F4]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#8ab4f8]">
                  Google
                </span>
                Maps · optional
              </div>
              <KeyRound className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Prefer official Google Maps basemaps? Paste a free API key here.
            </p>
          </button>

          {keyOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden pl-1"
            >
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="AIza… your Google Maps API key"
                className="h-9 rounded-xl bg-black/50 font-mono text-xs"
                spellCheck={false}
              />
              <a
                href="https://console.cloud.google.com/google/maps-apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-glow hover:underline"
              >
                Create a free key in Google Cloud <ExternalLink className="h-3 w-3" />
              </a>
            </motion.div>
          )}
        </div>

        {/* actions */}
        <div className="mt-6 flex flex-col gap-2">
          <Button
            className="h-11 border-transparent bg-glow text-black shadow-[0_0_28px_-6px_rgba(250,204,21,0.65)] hover:bg-glow/90"
            onClick={() => finish("open")}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Start glowing
          </Button>
          {keyOpen && key.trim().length >= 20 && (
            <Button
              variant="ghost"
              className="h-9 text-xs text-muted-foreground"
              onClick={() => finish("google")}
            >
              <Rocket className="mr-1.5 h-3.5 w-3.5" />
              Start with Google Maps instead
            </Button>
          )}
        </div>

        {/* legend preview */}
        <div className="mt-6 flex items-center justify-center gap-4 border-t border-border/60 pt-4 text-[10px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[4px] bg-glow shadow-[0_0_8px_var(--glow)]" />
            Visited
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[4px] border border-dashed border-wish bg-transparent" />
            Wishlist
          </span>
          <span className="flex items-center gap-1.5">
            <MousePointerClick className="h-3 w-3" />
            Tap to toggle
          </span>
        </div>
      </motion.div>
    </div>
  );
}
