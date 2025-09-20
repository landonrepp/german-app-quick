import fs from 'fs';
import path from 'path';
import type { FullConfig } from '@playwright/test';
import Database from 'better-sqlite3';

function cleanToken(raw: string): string {
  return raw.replace(/\p{P}+/gu, '').trim();
}

async function seedDb() {
  const dbPath = path.resolve(process.env.SQLITE_DB_PATH || path.resolve('.tmp', 'db.e2e.sqlite'));
  try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch {}

  const db = new Database(dbPath);
  // Apply migrations in order
  const migrationsDir = process.env.MIGRATIONS_DIR
    ? path.resolve(process.env.MIGRATIONS_DIR)
    : path.resolve(process.cwd(), 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();
  db.exec('BEGIN');
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      db.exec(sql);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  // Seed one document and sentences from fixture
  const fixture = fs.readFileSync(path.resolve('e2e/fixtures/sample.txt'), 'utf8');
  const lines = fixture.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  const insertDoc = db.prepare(`INSERT INTO documents (title, content) VALUES (?, ?)`);
  const insertSentence = db.prepare(`INSERT INTO sentences (document_id, content) VALUES (?, ?)`);
  const insertWord = db.prepare(`INSERT INTO words_in_sentences (sentence_id, word, cleaned_word) VALUES (?, ?, ?)`);
  const insertCard = db.prepare(`INSERT INTO anki_cards (unknown_words, front, back) VALUES (?, ?, '')`);

  const tx = db.transaction(() => {
    const docRes = insertDoc.run('e2e.txt', fixture);
    const docId = Number(docRes.lastInsertRowid);
    let firstFront: string | null = null;
    let firstUnknown: string[] = [];
    for (const s of lines) {
      const res = insertSentence.run(docId, s);
      const sentenceId = Number(res.lastInsertRowid);
      const rawWords = s.split(/\s+/);
      for (const rawWord of rawWords) {
        const cleaned = cleanToken(rawWord);
        if (!cleaned) continue;
        insertWord.run(sentenceId, rawWord, cleaned);
      }
      if (firstFront === null) {
        firstFront = s;
        firstUnknown = rawWords.map(w => cleanToken(w)).filter(Boolean);
      }
    }
    if (firstFront) insertCard.run(JSON.stringify(firstUnknown), firstFront);
  });
  tx();
}

async function globalSetup(_config: FullConfig) {
  await seedDb();
}

export default globalSetup;
