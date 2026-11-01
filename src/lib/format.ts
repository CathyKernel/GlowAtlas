/** Number & unit formatting helpers (English locale). */

export function fmtInt(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function fmtCompact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function fmtArea(km2: number): string {
  if (km2 >= 1_000_000) return `${fmtCompact(km2)} km²`;
  return `${fmtInt(km2)} km²`;
}

export function fmtPct(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function currentYear(): number {
  return new Date().getFullYear();
}
