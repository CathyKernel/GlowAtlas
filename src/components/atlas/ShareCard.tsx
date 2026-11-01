"use client";

/**
 * Share card — renders a 1080×1350 stats poster on a canvas
 * (country flags, progress ring, continent bars) and downloads it as PNG.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

import { BY_ID, computeStats, levelFor } from "@/lib/atlas";
import { accentSpec } from "@/lib/colors";
import { fmtArea, fmtCompact, fmtPct } from "@/lib/format";
import { useAtlas } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const W = 1080;
const H = 1350;

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function ShareCard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(true);
  const [url, setUrl] = useState<string | null>(null);

  const entries = useAtlas((s) => s.entries);
  const profileName = useAtlas((s) => s.profileName);
  const accent = useAtlas((s) => s.accent);
  const stats = useMemo(() => computeStats(entries), [entries]);
  const level = levelFor(stats.visitedCountries).level;
  const accentHex = accentSpec(accent).hex;
  const accentBright = accentSpec(accent).bright;

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      await Promise.all([
        document.fonts.load('700 96px "Space Grotesk"'),
        document.fonts.load('600 40px "Space Grotesk"'),
        document.fonts.load('500 30px "Geist"'),
      ]).catch(() => undefined);
    } catch {
      /* fonts are best-effort */
    }

    ctx.clearRect(0, 0, W, H);

    /* background — jet black with a faint warm cast */
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0c0b08");
    bg.addColorStop(0.55, "#0a0a08");
    bg.addColorStop(1, "#080806");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // glow blobs
    const blob = (x: number, y: number, r: number, rgba: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    blob(900, 180, 420, hexToRgba(accentHex, 0.18));
    blob(140, 1120, 500, hexToRgba(accentHex, 0.14));
    blob(950, 1250, 380, hexToRgba(accentHex, 0.1));

    // subtle dotted stars
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    for (let i = 0; i < 90; i++) {
      const x = (i * 761) % W;
      const y = (i * 439) % H;
      if ((x * 31 + y * 17) % 7 === 0) {
        ctx.fillRect(x, y, 2.2, 2.2);
      }
    }

    /* header */
    const title = (text: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "left") => {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.fillText(text, x, y);
    };

    title("GlowAtlas", W / 2, 108, '700 52px "Space Grotesk", sans-serif', "#ffffff", "center");
    title("LIGHT UP THE WORLD", W / 2, 152, '600 22px "Geist", sans-serif', hexToRgba(accentBright, 0.9), "center");

    // divider
    const line = ctx.createLinearGradient(120, 0, W - 120, 0);
    line.addColorStop(0, "rgba(255,255,255,0)");
    line.addColorStop(0.5, hexToRgba(accentBright, 0.65));
    line.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = line;
    ctx.fillRect(120, 186, W - 240, 2);

    /* name */
    const name = profileName.trim() || "An explorer";
    title(`${name} has lit up`, W / 2, 268, '500 38px "Geist", sans-serif', "rgba(226,232,240,0.85)", "center");

    /* big count + ring */
    const cx = W / 2;
    const cy = 470;
    const R = 190;
    ctx.lineWidth = 22;
    ctx.strokeStyle = "rgba(148,163,184,0.18)";
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    const ratio = Math.min(1, stats.pctWorld);
    const grad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    grad.addColorStop(0, accentBright);
    grad.addColorStop(1, accentHex);
    ctx.strokeStyle = grad;
    ctx.lineCap = "round";
    ctx.shadowColor = hexToRgba(accentHex, 0.55);
    ctx.shadowBlur = 34;
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.stroke();
    ctx.shadowBlur = 0;

    title(String(stats.visitedCountries), cx, cy + 8, '700 128px "Space Grotesk", sans-serif', "#ffffff", "center");
    title(`of ${stats.worldCountries} countries`, cx, cy + 66, '600 34px "Geist", sans-serif', "rgba(148,163,184,0.95)", "center");
    title(`${fmtPct(stats.pctWorld)} of the world`, cx, cy + 124, '700 34px "Space Grotesk", sans-serif', accentBright, "center");

    /* level + land row */
    const badgeY = 730;
    ctx.fillStyle = hexToRgba(accentHex, 0.12);
    roundRect(ctx, (W - 640) / 2, badgeY, 640, 74, 37);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(accentHex, 0.5);
    ctx.lineWidth = 2;
    roundRect(ctx, (W - 640) / 2, badgeY, 640, 74, 37);
    ctx.stroke();
    title(`${level.title}  ·  ${fmtPct(stats.landPct)} of Earth's land  ·  ${fmtCompact(stats.popReach)} people`, W / 2, badgeY + 47, '600 26px "Geist", sans-serif', "#e2e8f0", "center");

    /* flags strip */
    const flagIds = stats.visitedIds
      .map((id) => BY_ID[id])
      .filter((m) => m?.iso2)
      .sort((a, b) => a.name.localeCompare(b.name));
    const chosen = flagIds.slice(0, 20);
    const flagImgs = await Promise.all(
      chosen.map((m) => loadImage(`https://flagcdn.com/w160/${m.iso2!.toLowerCase()}.png`))
    );

    const rows = [chosen.slice(0, 10), chosen.slice(10, 20)];
    let fy = 880;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (row.length === 0) continue;
      const fw = 84;
      const fh = 60;
      const gap = 14;
      const totalW = row.length * fw + (row.length - 1) * gap;
      let fx = (W - totalW) / 2;
      for (let i = 0; i < row.length; i++) {
        const idx = r * 10 + i;
        const img = flagImgs[idx];
        ctx.save();
        roundRect(ctx, fx, fy, fw, fh, 12);
        ctx.clip();
        if (img) {
          ctx.drawImage(img, fx, fy, fw, fh);
        } else {
          ctx.fillStyle = "rgba(148,163,184,0.16)";
          ctx.fillRect(fx, fy, fw, fh);
          ctx.fillStyle = "rgba(226,232,240,0.8)";
          ctx.font = '700 26px "Space Grotesk", sans-serif';
          ctx.textAlign = "center";
          ctx.fillText(chosen[idx].iso2 ?? "··", fx + fw / 2, fy + 40);
        }
        ctx.restore();
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = 1.5;
        roundRect(ctx, fx, fy, fw, fh, 12);
        ctx.stroke();
        fx += fw + gap;
      }
      fy += fh + gap;
    }
    if (flagIds.length > 20) {
      title(`+ ${flagIds.length - 20} more countries glowing`, W / 2, fy + 8, '500 26px "Geist", sans-serif', "rgba(148,163,184,0.9)", "center");
    }

    /* continents bars */
    const bx = 130;
    let by = H - 330;
    title("CONTINENT PROGRESS", bx, by, '700 24px "Space Grotesk", sans-serif', "rgba(148,163,184,0.9)");
    by += 26;
    const barW = W - 130 * 2;
    for (const c of stats.continents.slice(0, 7)) {
      const cVisited = c.visited - c.visitedTerritories;
      if (c.total === 0) continue;
      ctx.font = '500 24px "Geist", sans-serif';
      ctx.fillStyle = "rgba(226,232,240,0.9)";
      ctx.textAlign = "left";
      ctx.fillText(c.name, bx, by + 20);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(148,163,184,0.9)";
      ctx.fillText(`${cVisited}/${c.countries}`, bx + barW, by + 20);

      ctx.fillStyle = "rgba(148,163,184,0.15)";
      roundRect(ctx, bx, by + 32, barW, 12, 6);
      ctx.fill();
      const r = c.countries ? cVisited / c.countries : 0;
      if (r > 0) {
        ctx.fillStyle = c.color;
        ctx.shadowColor = hexToRgba(c.color, 0.6);
        ctx.shadowBlur = 10;
        roundRect(ctx, bx, by + 32, Math.max(14, barW * r), 12, 6);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      by += 62;
    }

    /* footer */
    const footY = H - 56;
    title(
      `${stats.visitedTerritories} territories · ${stats.wishlistIds.length} wishlist · ${stats.earliestYear ? `since ${stats.earliestYear}` : "new journey"}  ·  glowatlas`,
      W / 2,
      footY,
      '500 22px "Geist", sans-serif',
      "rgba(148,163,184,0.65)",
      "center"
    );

    setUrl(canvas.toDataURL("image/png"));
    setRendering(false);
  }, [entries, profileName, accentHex, accentBright, stats, level]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (!cancelled) void render();
    }, 30);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, render]);

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    const slug = (profileName.trim() || "explorer").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.download = `glowatlas-${slug}.png`;
    a.click();
    toast.success("Stats card saved — share away!");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden border-border bg-popover/95 backdrop-blur-xl">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="font-display text-lg">Your travel poster</DialogTitle>
          <DialogDescription className="text-xs">
            A 1080×1350 card — perfect for Instagram stories and socials.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 bg-black/40 px-5 pb-2">
          <div className="relative mx-auto aspect-[1080/1350] w-full max-w-[300px] overflow-hidden rounded-xl border border-border/60">
            <canvas ref={canvasRef} width={W} height={H} className="h-full w-full" />
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="h-6 w-6 animate-spin text-glow" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 p-4">
          <Button className="h-10 flex-1" onClick={download} disabled={rendering || !url}>
            <Download className="mr-2 h-4 w-4" /> Download PNG
          </Button>
          {typeof navigator !== "undefined" && "share" in navigator && url && (
            <Button
              variant="outline"
              className="h-10"
              onClick={async () => {
                try {
                  const blob = await (await fetch(url)).blob();
                  const file = new File([blob], "glowatlas.png", { type: "image/png" });
                  await navigator.share({ files: [file], title: "My GlowAtlas" });
                } catch {
                  /* user cancelled */
                }
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* helpers ------------------------------------------------------------- */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
