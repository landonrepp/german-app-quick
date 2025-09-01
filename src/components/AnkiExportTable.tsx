"use client";

import { useEffect, useMemo, useState } from "react";
import { getAnkiCardsAction, updateAnkiBackAction, updateAnkiFrontAction } from "@/utils/ankiActions";

type AnkiCard = {
  id: number;
  front: string;
  back: string;
  unknown_words?: string | null;
  created_at?: string | null;
};

function CardRow({ card }: { card: AnkiCard }) {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [editingFront, setEditingFront] = useState(false);
  const [editingBack, setEditingBack] = useState(false);
  const [savingFront, setSavingFront] = useState(false);
  const [savingBack, setSavingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync from props when not editing
  useEffect(() => {
    if (!editingFront) setFront(card.front);
  }, [card.front, editingFront]);
  useEffect(() => {
    if (!editingBack) setBack(card.back);
  }, [card.back, editingBack]);

  const hasBack = (card.back ?? "").trim().length > 0;

  const saveFront = async () => {
    if (front === card.front) return;
    setSavingFront(true);
    setError(null);
    try {
      await updateAnkiFrontAction(card.id, front);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Failed to save front");
    } finally {
      setSavingFront(false);
    }
  };

  const saveBack = async () => {
    if (back === card.back) return;
    setSavingBack(true);
    setError(null);
    try {
      await updateAnkiBackAction(card.id, back);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Failed to save back");
    } finally {
      setSavingBack(false);
    }
  };

  return (
    <tr className="border-t border-gray-300">
      <td className="p-2 border-r border-gray-300 align-top hidden sm:table-cell">{card.id}</td>
      <td className="p-2 align-top whitespace-pre-wrap break-words">
        <textarea
          className="w-full border border-gray-300 rounded p-2 text-sm"
          rows={3}
          value={front}
          onChange={(e) => setFront(e.target.value)}
          onFocus={() => setEditingFront(true)}
          onBlur={() => {
            setEditingFront(false);
            void saveFront();
          }}
        />
        <div className="text-xs text-gray-500 h-4">
          {savingFront ? "Saving…" : ""}
        </div>
      </td>
      <td className="p-2 align-top whitespace-pre-wrap break-words border-l border-gray-300">
        <textarea
          className="w-full border border-gray-300 rounded p-2 text-sm"
          rows={4}
          value={hasBack ? back : ""}
          disabled={!hasBack}
          placeholder={hasBack ? undefined : "Translating…"}
          onChange={(e) => setBack(e.target.value)}
          onFocus={() => setEditingBack(true)}
          onBlur={() => {
            setEditingBack(false);
            if (hasBack) void saveBack();
          }}
        />
        <div className="text-xs text-gray-500 h-4">
          {savingBack ? "Saving…" : (!hasBack ? "Waiting for translation…" : "")}
        </div>
        {error && <div className="text-xs text-red-500">{error}</div>}
      </td>
      <td className="p-2 border-l border-gray-300 align-top hidden md:table-cell">
        {(() => {
          try {
            return card.unknown_words ? ((JSON.parse(card.unknown_words) as unknown[])?.length ?? 0) : 0;
          } catch {
            return 0;
          }
        })()}
      </td>
    </tr>
  );
}

export default function AnkiExportTable() {
  const [cards, setCards] = useState<AnkiCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = async () => {
    try {
      const list = await getAnkiCardsAction();
      setCards(Array.isArray(list) ? list : []);
      setError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Failed to load cards");
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
            <CardRow key={c.id} card={c} />
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
