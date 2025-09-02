import 'server-only';

import { getDatabase } from "@/utils/db";
import { emitCardUpdated } from "@/utils/events";

type PendingCard = {
  id: number;
  front: string;
  unknown_words: string | null;
};

let isRunning = false;
let stopRequested = false;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const env = () => ({
  apiKey: process.env.OPENAI_API_KEY,
  baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  pollMs: Number(process.env.TRANSLATION_POLL_MS || 5000),
  batchSize: Number(process.env.TRANSLATION_BATCH_SIZE || 5),
  devFallback: process.env.TRANSLATION_DEV_FALLBACK === "1",
});

// single-item translation function removed (unused) in favor of batch flow

type BatchItem = { id: number; sentence: string; unknownWords: string[] };
type BatchResult = { id: number; translation: string; glosses: { de: string; en: string }[] }[];

function buildBatchPrompt(items: BatchItem[]) {
  const lines: string[] = [];
  lines.push(
    "You are a precise translator for German→English.",
    "For EACH input item, translate the sentence to natural English and provide short word glosses ONLY for the provided unknown words.",
    "Respond with STRICT JSON: an array of objects with schema:",
    "[{\"id\": <number>, \"translation\": \"<english>\", \"glosses\": [{\"de\": \"<word>\", \"en\": \"<short gloss>\"}]}]",
    "Maintain the same 'id' values from input. If no unknown words are given for an item, return an empty glosses array for that item.",
    "Do not include any commentary or markdown, just the raw JSON array."
  );
  lines.push("", "Input items:");
  for (const it of items) {
    const unk = it.unknownWords?.length ? it.unknownWords.join(", ") : "<none>";
    lines.push(
      `id: ${it.id}`,
      `sentence: ${it.sentence}`,
      `unknown: ${unk}`,
      "---"
    );
  }
  return lines.join("\n");
}

async function callOpenAITranslateBatch(items: BatchItem[]): Promise<BatchResult | null> {
  const { apiKey, baseUrl, model, devFallback } = env();
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set; skipping translation.");
    return null;
  }
  try {
    const rsp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You translate German to English succinctly." },
          { role: "user", content: buildBatchPrompt(items) },
        ],
        temperature: 0,
      }),
    });
    if (!rsp.ok) {
      const text = await rsp.text().catch(() => "");
      console.error("OpenAI error (batch)", rsp.status, text);
      return null;
    }
    const data = await rsp.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    // Extract JSON array
    const start = content.indexOf("[");
    const end = content.lastIndexOf("]");
    const jsonStr = start >= 0 && end >= 0 ? content.slice(start, end + 1) : content;
    const parsed = JSON.parse(jsonStr) as unknown;
    if (!Array.isArray(parsed)) throw new Error("Model did not return an array");
    return (parsed as unknown[]).map((row) => {
      const r = row as { id?: unknown; translation?: unknown; glosses?: unknown };
      const glosses = Array.isArray(r.glosses)
        ? (r.glosses as unknown[]).map((g) => {
            const obj = g as { de?: unknown; en?: unknown };
            return { de: String(obj.de ?? ""), en: String(obj.en ?? "") };
          })
        : [];
      return {
        id: Number(r.id),
        translation: String(r.translation ?? "").trim(),
        glosses,
      };
    });
  } catch (e) {
    console.error("Batch translation failed:", e);
    if (devFallback) {
      return items.map(({ id, sentence, unknownWords }) => ({
        id,
        translation: `DEV: ${sentence}`,
        glosses: unknownWords.map((w) => ({ de: w, en: w })),
      }));
    }
    return null;
  }
}

function formatBackText(result: { translation: string; glosses: { de: string; en: string }[] }) {
  const lines: string[] = [];
  if (result.translation) {
    lines.push(result.translation);
  }
  if (result.glosses?.length) {
    lines.push("", "Unknown words:");
    for (const g of result.glosses) {
      if (!g.de) continue;
      lines.push(`- ${g.de}: ${g.en || ""}`);
    }
  }
  return lines.join("\n");
}

async function getPendingCards(limit = 5): Promise<PendingCard[]> {
  const db = await getDatabase();
  const rows = (db
    .prepare(
      `SELECT id, front, unknown_words
       FROM anki_cards
       WHERE (back IS NULL OR back = '')
         AND (exported_at IS NULL)
       ORDER BY id ASC
       LIMIT ?`
    )
    .all(limit)) as PendingCard[];
  return rows;
}

async function setBackText(id: number, back: string) {
  const db = await getDatabase();
  db.prepare(`UPDATE anki_cards SET back = ? WHERE id = ?`).run(back, id);
}

export async function runTranslationPoller() {
  if (isRunning) return;
  isRunning = true;
  stopRequested = false;

  try {
    const { pollMs, batchSize } = env();
    while (!stopRequested) {
      const pending = await getPendingCards(batchSize);
      if (!pending.length) {
        await sleep(pollMs);
        continue;
      }

      // Build batch payload
      const items: BatchItem[] = pending.map((card) => ({
        id: card.id,
        sentence: card.front,
        unknownWords: safeParseUnknown(card.unknown_words),
      }));
      const results = await callOpenAITranslateBatch(items);
      if (!results) {
        // If batch failed, wait a bit and retry next cycle
        await sleep(1000);
        continue;
      }
      // Index by id for quick lookup
      const byId = new Map<number, { translation: string; glosses: { de: string; en: string }[] }>();
      for (const r of results) byId.set(r.id, { translation: r.translation, glosses: r.glosses });

      for (const card of pending) {
        const r = byId.get(card.id);
        if (!r) continue;
        const back = formatBackText(r);
        await setBackText(card.id, back);
        emitCardUpdated(card.id);
        await sleep(50);
      }
    }
  } finally {
    isRunning = false;
  }
}

export function stopTranslationPoller() {
  stopRequested = true;
}

export function isTranslationPollerRunning() {
  return isRunning;
}

function safeParseUnknown(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

// Optional autostart via env flag, only in dev/runtime (never during build)
if (process.env.NODE_ENV !== 'production' && process.env.TRANSLATION_JOB_AUTOSTART === "1") {
  runTranslationPoller().catch((e) => console.error("Translation poller failed:", e));
}
