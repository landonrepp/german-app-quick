"use client";

import { useCallback, useState } from "react";
import { getAnkiCardsAction, markAnkiCardsExportedAction } from "@/utils/ankiActions";
// No HTML encoding — we render as HTML and minify

function csvEscape(value: string): string {
  // Always quote and escape quotes by doubling them
  const v = value ?? "";
  return `"${v.replace(/"/g, '""')}"`;
}

function textToHtmlMinified(input: string): string {
  if (!input) return "";
  return String(input).replace(/\r\n|\r|\n/g, '<br/>').trim();
}

export default function ExportButton() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const cards = await getAnkiCardsAction();
      const rows = (Array.isArray(cards) ? cards : []).map((c: any) => {
        let words: string[] = [];
        try {
          if (c.unknown_words) words = JSON.parse(c.unknown_words) ?? [];
        } catch {}
        const id = words.join("_");
        const front = textToHtmlMinified(String(c.front ?? ""));
        const back = textToHtmlMinified(String(c.back ?? ""));
        return `${csvEscape(String(id))},${csvEscape(front)},${csvEscape(back)}`;
      });

      const csv = rows.join("\n"); // No header as requested
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
      const ids = (Array.isArray(cards) ? cards : []).map((c: any) => c.id).filter((x: any) => typeof x === 'number');
      if (ids.length > 0) {
        await markAnkiCardsExportedAction(ids);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to export cards");
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
