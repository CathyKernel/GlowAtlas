import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Prefix a public-asset path with the deployment basePath.
 * Empty for root deployments; "/<repo>" when exported for GitHub Pages
 * project sites (inlined at build time via next.config env).
 */
export function withBase(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || ""
  return `${base}${path}`
}
