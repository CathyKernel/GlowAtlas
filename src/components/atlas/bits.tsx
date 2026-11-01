"use client";

/**
 * Small shared building blocks used across the GlowAtlas UI.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Star } from "lucide-react";
import { flagEmoji } from "@/lib/atlas";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Flag image (flagcdn) with graceful fallback to emoji/initials       */
/* ------------------------------------------------------------------ */

export function FlagImg({
  iso2,
  name,
  w = 40,
  className,
}: {
  iso2: string | null;
  name?: string;
  w?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!iso2 || failed) {
    return (
      <div
        aria-label={name ?? "flag"}
        className={cn(
          "flex items-center justify-center rounded-md bg-secondary text-[10px] font-bold tracking-wide text-muted-foreground",
          className
        )}
        style={{ width: w * 1.25, height: w * 0.9 }}
      >
        {iso2 ? iso2 : flagEmoji(null)}
      </div>
    );
  }
  return (
    <img
      src={`https://flagcdn.com/w${w}/${iso2.toLowerCase()}.png`}
      alt={name ? `${name} flag` : "flag"}
      width={Math.round(w * 1.25)}
      height={Math.round(w * 0.9)}
      loading="lazy"
      className={cn("rounded-md object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Animated counter                                                    */
/* ------------------------------------------------------------------ */

export function CountUp({
  value,
  duration = 900,
  className,
  suffix,
}: {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={className}>
      {new Intl.NumberFormat("en-US").format(display)}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Progress ring                                                       */
/* ------------------------------------------------------------------ */

export function ProgressRing({
  ratio,
  size = 148,
  stroke = 10,
  color,
  trackColor = "color-mix(in oklab, var(--muted-foreground) 22%, transparent)",
  children,
}: {
  ratio: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color ?? "var(--glow)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.4s ease",
            filter: "drop-shadow(0 0 8px color-mix(in srgb, var(--glow) 60%, transparent))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slim progress bar                                                   */
/* ------------------------------------------------------------------ */

export function Bar({
  ratio,
  color,
  className,
  height = 6,
}: {
  ratio: number;
  color?: string;
  className?: string;
  height?: number;
}) {
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-border/60", className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(ratio > 0 ? 2 : 0, Math.min(100, ratio * 100))}%`,
          background: color ?? "var(--glow)",
          boxShadow: `0 0 10px color-mix(in srgb, ${color ?? "var(--glow)"} 55%, transparent)`,
          transition: "width 0.9s cubic-bezier(0.22, 1, 0.36, 1), background 0.4s ease",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Three-state status control (none / visited / wishlist)              */
/* ------------------------------------------------------------------ */

export function StatusControl({
  status,
  onChange,
  size = "md",
}: {
  status: "none" | "visited" | "wishlist";
  onChange: (s: "none" | "visited" | "wishlist") => void;
  size?: "sm" | "md";
}) {
  const btn =
    size === "sm"
      ? "h-7 w-7 rounded-lg"
      : "h-9 w-9 rounded-xl";
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Visit status">
      <button
        aria-label="Mark visited"
        title="Visited"
        className={cn(
          "flex items-center justify-center border transition",
          btn,
          status === "visited"
            ? "border-transparent text-black"
            : "border-border text-muted-foreground hover:border-glow/60 hover:text-glow"
        )}
        style={status === "visited" ? { background: "var(--glow)" } : undefined}
        onClick={(e) => {
          e.stopPropagation();
          onChange(status === "visited" ? "none" : "visited");
        }}
      >
        <Check className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
      <button
        aria-label="Add to wishlist"
        title="Wishlist"
        className={cn(
          "flex items-center justify-center border transition",
          btn,
          status === "wishlist"
            ? "border-transparent text-black"
            : "border-border text-muted-foreground hover:border-wish/70 hover:text-wish"
        )}
        style={status === "wishlist" ? { background: "var(--wish)" } : undefined}
        onClick={(e) => {
          e.stopPropagation();
          onChange(status === "wishlist" ? "none" : "wishlist");
        }}
      >
        <Star className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section heading inside panels                                       */
/* ------------------------------------------------------------------ */

export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {children}
      </h3>
      {right}
    </div>
  );
}
