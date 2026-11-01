"use client";

/**
 * GlowAtlas persistent store — everything lives in localStorage, no backend.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccentId, MapThemeId, ProviderId } from "@/lib/colors";

export type CountryStatus = "none" | "visited" | "wishlist";

export interface CountryEntry {
  status: CountryStatus;
  years: number[];
  rating: number; // 0..5
  notes: string;
  updatedAt: number;
}

export interface AtlasData {
  version: number;
  profileName: string;
  entries: Record<string, CountryEntry>;
}

interface AtlasState {
  profileName: string;
  onboarded: boolean;
  provider: ProviderId;
  googleKey: string;
  theme: MapThemeId;
  accent: AccentId;
  quickMode: boolean;

  entries: Record<string, CountryEntry>;
  /** transient UI state (not persisted) */
  selected: string | null;

  setProfileName: (name: string) => void;
  setOnboarded: (v: boolean) => void;
  setProvider: (p: ProviderId) => void;
  setGoogleKey: (key: string) => void;
  setTheme: (t: MapThemeId) => void;
  setAccent: (a: AccentId) => void;
  setQuickMode: (v: boolean) => void;

  select: (id: string | null) => void;

  setStatus: (id: string, status: CountryStatus) => void;
  toggleVisited: (id: string) => void;
  addYear: (id: string, year: number) => void;
  removeYear: (id: string, year: number) => void;
  setRating: (id: string, rating: number) => void;
  setNotes: (id: string, notes: string) => void;

  importData: (data: AtlasData) => void;
  replaceEntries: (entries: Record<string, CountryEntry>) => void;
  clearAll: () => void;
}

const bump = (entries: Record<string, CountryEntry>, id: string, next: CountryEntry) => {
  if (next.status === "none" && next.years.length === 0 && !next.notes && next.rating === 0) {
    const copy = { ...entries };
    delete copy[id];
    return copy;
  }
  return { ...entries, [id]: next };
};

export const useAtlas = create<AtlasState>()(
  persist(
    (set, get) => ({
      profileName: "",
      onboarded: false,
      provider: "open",
      googleKey: "",
      theme: "midnight",
      accent: "gold",
      quickMode: false,

      entries: {},
      selected: null,

      setProfileName: (profileName) => set({ profileName }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setProvider: (provider) => set({ provider }),
      setGoogleKey: (googleKey) => set({ googleKey }),
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setQuickMode: (quickMode) => set({ quickMode }),

      select: (selected) => set({ selected }),

      setStatus: (id, status) =>
        set((s) => {
          const cur = s.entries[id];
          return {
            entries: bump(s.entries, id, {
              status,
              years: status === "none" ? [] : cur?.years ?? [],
              rating: status === "none" ? 0 : cur?.rating ?? 0,
              notes: status === "none" ? "" : cur?.notes ?? "",
              updatedAt: Date.now(),
            }),
          };
        }),

      toggleVisited: (id) => {
        const cur = get().entries[id];
        get().setStatus(id, cur?.status === "visited" ? "none" : "visited");
      },

      addYear: (id, year) =>
        set((s) => {
          const cur = s.entries[id];
          if (!cur || cur.years.includes(year)) return {};
          return {
            entries: bump(s.entries, id, {
              ...cur,
              years: [...cur.years, year].sort((a, b) => a - b),
              updatedAt: Date.now(),
            }),
          };
        }),

      removeYear: (id, year) =>
        set((s) => {
          const cur = s.entries[id];
          if (!cur) return {};
          return {
            entries: bump(s.entries, id, {
              ...cur,
              years: cur.years.filter((y) => y !== year),
              updatedAt: Date.now(),
            }),
          };
        }),

      setRating: (id, rating) =>
        set((s) => {
          const cur = s.entries[id];
          if (!cur) return {};
          return { entries: bump(s.entries, id, { ...cur, rating, updatedAt: Date.now() }) };
        }),

      setNotes: (id, notes) =>
        set((s) => {
          const cur = s.entries[id];
          if (!cur) return {};
          return { entries: bump(s.entries, id, { ...cur, notes, updatedAt: Date.now() }) };
        }),

      importData: (data) =>
        set({
          profileName: typeof data.profileName === "string" ? data.profileName : "",
          entries: data.entries && typeof data.entries === "object" ? data.entries : {},
        }),

      replaceEntries: (entries) => set({ entries }),

      clearAll: () => set({ entries: {} }),
    }),
    {
      name: "glowatlas.v1",
      version: 3,
      partialize: (s) => ({
        profileName: s.profileName,
        onboarded: s.onboarded,
        provider: s.provider,
        googleKey: s.googleKey,
        theme: s.theme,
        accent: s.accent,
        quickMode: s.quickMode,
        entries: s.entries,
      }),
      /* v2: legacy multi-color accents collapsed into the single solar-gold accent
       * v3: wipe pre-existing demo/test entries so every visitor starts on a
       *     pristine map with zero visited countries */
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) state.accent = "gold";
        if (version < 3) state.entries = {};
        return state as typeof state;
      },
    }
  )
);

/** Selectors used across components */
export const selectEntry = (id: string) => (s: AtlasState) => s.entries[id];
