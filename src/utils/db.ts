'use server';

import Database from 'better-sqlite3';
import fs from 'fs';
import { cleanToken } from './text';


const database = new Database('./db.sqlite', {verbose: console.log});

export const getDatabase = async () => database;

// Skip auto-migrations in E2E mode to avoid DB file conflicts.
if (process.env.E2E_MODE !== '1') (async () => {
  try {
    console.log('Initializing migrations table if needed...');
    database.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Prepare statements and a transaction to apply a migration atomically
    const selectMigration = database.prepare(`SELECT 1 FROM migrations WHERE name = ?`);
    const insertMigration = database.prepare(`INSERT INTO migrations (name) VALUES (?)`);
    const applyMigration = database.transaction((file: string, sql: string) => {
      database.exec(sql);
      insertMigration.run(file);
    });

    fs.readdirSync('./migrations').forEach(file => {
      try {
        const migration = selectMigration.get(file);
        if (migration) return;

        const sql = fs.readFileSync(`./migrations/${file}`, 'utf8');
        // Execute the migration and record it in a single transaction
        applyMigration(file, sql);
        console.log(`Migration applied successfully: ${file}`);
      } catch (err) {
        console.error(`Error applying migration ${file}:`, err);
      }
    });
  } catch (err) {
    console.error('Error initializing migrations table or reading migration files:', err);
  }
})();

export type ImportSentencesResult =
  | {
      ok: true;
      documentId: number;
      insertedSentences: number;
    }
  | {
      ok: false;
      code:
        | 'NO_SENTENCES'
        | 'DOCUMENT_ALREADY_EXISTS'
        | 'DOCUMENT_INSERT_FAILED'
        | 'SENTENCE_INSERT_FAILED'
        | 'DB_ERROR';
      message: string;
      details?: string;
    };

export const importSentences = async ({
  content,
  sentences,
  fileName,
}: {
  content: string;
  sentences: string[];
  fileName: string;
}): Promise<ImportSentencesResult> => {
  if (!Array.isArray(sentences) || sentences.length === 0) {
    return {
      ok: false,
      code: 'NO_SENTENCES',
      message: 'No German sentences were detected in the file.',
    };
  }

  try {
    const documentInsert = database.prepare(`
        INSERT INTO documents (title, content) VALUES (?, ?)
    `);
    const sentenceInsert = database.prepare(`
        INSERT INTO sentences (document_id, content) VALUES (?, ?)
    `);

    const wordInsert = database.prepare(`
        INSERT INTO words_in_sentences (sentence_id, word, cleaned_word) VALUES (?, ?, ?)
      `);

    const tx = database.transaction(() => {
      const docRes = documentInsert.run(fileName, content);
      if (!docRes) {
        throw Object.assign(new Error('Document insert returned no result'), {
          _reason: 'DOCUMENT_INSERT_FAILED',
        });
      }
      const documentId = Number(docRes.lastInsertRowid);

      let count = 0;
      for (const s of sentences) {
        const res = sentenceInsert.run(documentId, s);
        if (!res) {
          throw Object.assign(new Error('Sentence insert returned no result'), {
            _reason: 'SENTENCE_INSERT_FAILED',
          });
        }
        count += 1;

        const sentenceId = Number(res.lastInsertRowid);

        for (const rawWord of s.split(/\s+/)) {
          const cleaned = cleanToken(rawWord);
          if (!cleaned) continue;
          wordInsert.run(sentenceId, rawWord, cleaned);
        }
      }
      return { documentId, count };
    });

    const { documentId, count } = tx();

    return { ok: true, documentId, insertedSentences: count };
  } catch (e: any) {
    console.log(e);
    // Map better-sqlite3/SQLite errors to descriptive results
    const code = e?.code as string | undefined;
    const msg = e?.message as string | undefined;
    const reason = e?._reason as string | undefined;

    // Broaden detection for UNIQUE constraint on documents.title
    const isUniqueTitleViolation =
      (code?.startsWith('SQLITE_CONSTRAINT') ?? false) &&
      (msg?.includes('UNIQUE constraint failed: documents.title') ||
        msg?.includes('documents.title'));

    if (isUniqueTitleViolation) {
      return {
        ok: false,
        code: 'DOCUMENT_ALREADY_EXISTS',
        message:
          'A document with this file name already exists. Rename the file and try again.',
        details: msg,
      };
    }

    if (reason === 'DOCUMENT_INSERT_FAILED') {
      return {
        ok: false,
        code: 'DOCUMENT_INSERT_FAILED',
        message: 'Failed to create a document record in the database.',
        details: msg,
      };
    }

    if (reason === 'SENTENCE_INSERT_FAILED') {
      return {
        ok: false,
        code: 'SENTENCE_INSERT_FAILED',
        message: 'Failed to insert one or more sentences into the database.',
        details: msg,
      };
    }

    return {
      ok: false,
      code: 'DB_ERROR',
      message: 'An unexpected database error occurred while importing sentences.',
      details: msg,
    };
  }
};
