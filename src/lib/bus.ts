"use client";

/**
 * Tiny typed event bus — lets deep UI (country rows, search results) talk to
 * the map and top-level dialogs without prop drilling.
 */

type EventMap = {
  focus: { id: string };
  pulse: { id: string };
  openDetail: { id: string };
  openSearch: undefined;
  openShare: undefined;
  openSettings: undefined;
};

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

const listeners: { [K in keyof EventMap]?: Set<Handler<K>> } = {};

export const bus = {
  on<K extends keyof EventMap>(event: K, handler: Handler<K>): () => void {
    const set = (listeners[event] as Set<Handler<K>>) ?? new Set<Handler<K>>();
    set.add(handler);
    (listeners as Record<string, Set<Handler<K>>>)[event] = set;
    return () => set.delete(handler);
  },
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = listeners[event] as Set<Handler<K>> | undefined;
    if (set) set.forEach((h) => h(payload));
  },
};
