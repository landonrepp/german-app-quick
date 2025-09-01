"use client";

import { useCallback, useState } from "react";
import { getAnkiCardsAction, markAnkiCardsExportedAction } from "@/utils/ankiActions";
// No HTML encoding — we render as HTML and minify

function csvEscape(value: string): string {
  // Always quote and escape quotes by doubling them
  const v = value ?? "";
  return `"${v.replace(/"/g, '""')}"`;
}

type ClientAnkiCard = {
  id: number;
  front: string;
  back: string;
  unknown_words?: string | null;
};

export default function ExportButton() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const cards = await getAnkiCardsAction();
      const list: ClientAnkiCard[] = Array.isArray(cards) ? (cards as ClientAnkiCard[]) : [];
      const rows = list.map((c) => {
        let words: string[] = [];
        try {
          if (c.unknown_words) words = JSON.parse(c.unknown_words) ?? [];
        } catch {}
        const id = words.join("_");
        const front = String(c.front ?? "").replace(/\r?\n/g, '<br/>').trim();
        const back = String(c.back ?? "").replace(/\r?\n/g, '<br/>').trim();
        return `${csvEscape(String(id))},${csvEscape(front)},${csvEscape(back)}`;
      });

      const csv = rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const now = new Date();
      const pad = (n: number) => `${n}`.padStart(2, "0");
      const fileName = `anki_export_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.csv`;
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Mark exported after generating the CSV
      const ids = list.map((c) => c.id).filter((x) => typeof x === 'number');
      if (ids.length > 0) {
        await markAnkiCardsExportedAction(ids);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Failed to export cards");
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-red-500 text-sm">{error}</span>}
      <button
        type="button"
        onClick={onExport}
        disabled={exporting}
        className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
        aria-label="export"
        title="export"
      >
        {exporting ? "Exporting…" : "export"}
      </button>
    </div>
  );
}
