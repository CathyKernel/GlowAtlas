"use client";

/**
 * Data export helpers — JSON backups and CSV spreadsheets.
 */

import { BY_ID } from "@/lib/atlas";
import { useAtlas, type AtlasData } from "@/lib/store";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJson() {
  const { profileName, entries } = useAtlas.getState();
  const data: AtlasData = { version: 1, profileName, entries };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, `glowatlas-backup-${new Date().toISOString().slice(0, 10)}.json`);
}

export function exportCsv() {
  const { entries } = useAtlas.getState();
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = ["id,name,iso2,status,years,rating,notes"];
  for (const [id, e] of Object.entries(entries)) {
    const m = BY_ID[id];
    if (!m) continue;
    lines.push(
      [
        id,
        m.name,
        m.iso2 ?? "",
        e.status,
        e.years.join(";"),
        e.rating,
        e.notes.replace(/\n/g, " "),
      ]
        .map(esc)
        .join(",")
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `glowatlas-countries-${new Date().toISOString().slice(0, 10)}.csv`);
}

export async function parseBackupFile(file: File): Promise<AtlasData> {
  const text = await file.text();
  const data = JSON.parse(text) as AtlasData;
  if (!data || typeof data !== "object" || typeof data.entries !== "object") {
    throw new Error("Not a GlowAtlas backup file");
  }
  return data;
}
