"use client";

import { useEffect, useMemo, useState } from "react";

type AnkiCard = {
  id: number;
  front: string;
  back: string;
  unknown_words?: string | null;
  created_at?: string | null;
};

export default function AnkiExportTable() {
  const [cards, setCards] = useState<AnkiCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = async () => {
    try {
      const rsp = await fetch("/api/anki-cards", { cache: "no-store" });
      if (!rsp.ok) throw new Error(`HTTP ${rsp.status}`);
      const data = await rsp.json();
      setCards(Array.isArray(data.cards) ? data.cards : []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load cards");
    }
  };

  useEffect(() => {
    fetchCards();
    const id = setInterval(fetchCards, 2000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => cards ?? [], [cards]);

  return (
    <div className="w-full overflow-x-auto my-6">
      {error && (
        <div className="text-red-400 text-sm mb-2">{error}</div>
      )}
      <table className="table-auto w-full border border-gray-300">
        <thead>
          <tr>
            <th className="w-16 p-2 text-left border-b border-gray-300 hidden sm:table-cell">ID</th>
            <th className="p-2 text-left border-b border-gray-300">Front</th>
            <th className="p-2 text-left border-b border-gray-300">Back</th>
            <th className="w-20 p-2 text-left border-b border-gray-300 hidden md:table-cell">Unknown</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-t border-gray-300">
              <td className="p-2 border-r border-gray-300 align-top hidden sm:table-cell">{c.id}</td>
              <td className="p-2 align-top whitespace-pre-wrap break-words">{c.front}</td>
              <td className="p-2 align-top whitespace-pre-wrap break-words border-l border-gray-300">
                {c.back && c.back.trim().length > 0 ? c.back : "..."}
              </td>
              <td className="p-2 border-l border-gray-300 align-top hidden md:table-cell">
                {(() => {
                  try {
                    return c.unknown_words ? (JSON.parse(c.unknown_words)?.length ?? 0) : 0;
                  } catch {
                    return 0;
                  }
                })()}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="p-4 text-center text-gray-500">
                {cards === null ? "Loading..." : "No cards yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

