"use server";

import fs from "fs";
import path from "path";
// Minimal runtime-safe typing for better-sqlite3 we use
type SqliteStatement = {
  run: (...params: unknown[]) => {
    changes: number;
    lastInsertRowid: number | bigint;
  };
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
};
type SqliteDatabase = {
  prepare: (sql: string) => SqliteStatement;
  exec: (sql: string) => void;
  transaction: <T extends (...args: unknown[]) => unknown>(fn: T) => T;
  close: () => void;
};
import { cleanToken } from "./text";

// Resolve migrations directory once (works in production bundle where CWD differs)
const migrationsDir = process.env.MIGRATIONS_DIR
  ? path.resolve(process.env.MIGRATIONS_DIR)
  : path.resolve(process.cwd(), "migrations");

const dbPath = path.resolve(process.env.SQLITE_DB_PATH || "./db.sqlite");
const verbose:
  | ((message?: unknown, ...optionalParams: unknown[]) => void)
  | undefined = process.env.SQLITE_VERBOSE === "1" ? console.log : undefined;
let database: SqliteDatabase | null = null;

export const getDatabase = async (): Promise<SqliteDatabase> => {
  if (!database) {
    // Lazy-load native module with dynamic import to avoid build-time dlopen
    const mod = await import("better-sqlite3");
    const BetterSqlite3 = (
      mod as unknown as {
        default: new (
          filename: string,
          options?: {
            readonly?: boolean;
            fileMustExist?: boolean;
            timeout?: number;
            verbose?: (...args: unknown[]) => void;
            memory?: boolean;
          }
        ) => SqliteDatabase;
      }
    ).default;
    database = new BetterSqlite3(dbPath, { verbose });
    await ensureMigrations();
  }
  return database;
};

let migrationsInitialized = false;
export const ensureMigrations = async () => {
  const db = database;
  if (!db) throw new Error("Database not initialized");
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const selectMigration = db.prepare(`SELECT 1 FROM migrations WHERE name = ?`);
  const insertMigration = db.prepare(
    `INSERT INTO migrations (name) VALUES (?)`
  );
  const applyMigration = db.transaction((...args: unknown[]) => {
    const [file, sql] = args as [string, string];
    db.exec(sql);
    insertMigration.run(file);
  });

  let migrationFiles: string[] = [];
  try {
    migrationFiles = fs.readdirSync(migrationsDir);
  } catch (e) {
    console.error("Failed to read migrations directory", migrationsDir, e);
    return; // Do not throw to avoid crashing the app; DB just stays un-migrated.
  }
  for (const file of migrationFiles) {
    try {
      const migration = selectMigration.get(file);
      if (migration) continue;
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, "utf8");
      applyMigration(file, sql);
      console.log(`Migration applied successfully: ${file}`);
    } catch (err) {
      console.error(`Error applying migration ${file}:`, err);
    }
  }
  migrationsInitialized = true;
};

export type ImportSentencesResult =
  | {
      ok: true;
      documentId: number;
      insertedSentences: number;
    }
  | {
      ok: false;
      code:
        | "NO_SENTENCES"
        | "DOCUMENT_ALREADY_EXISTS"
        | "DOCUMENT_INSERT_FAILED"
        | "SENTENCE_INSERT_FAILED"
        | "DB_ERROR";
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
      code: "NO_SENTENCES",
      message: "No German sentences were detected in the file.",
    };
  }

  try {
    const db = await getDatabase();
    const documentInsert = db.prepare(`
        INSERT INTO documents (title, content) VALUES (?, ?)
    `);
    const sentenceInsert = db.prepare(`
        INSERT INTO sentences (document_id, content) VALUES (?, ?)
    `);

    const wordInsert = db.prepare(`
        INSERT INTO words_in_sentences (sentence_id, word, cleaned_word) VALUES (?, ?, ?)
      `);

    const tx = db.transaction(() => {
      const docRes = documentInsert.run(fileName, content);
      if (!docRes) {
        throw Object.assign(new Error("Document insert returned no result"), {
          _reason: "DOCUMENT_INSERT_FAILED",
        });
      }
      const documentId = Number(docRes.lastInsertRowid);

      let count = 0;
      for (const s of sentences) {
        const res = sentenceInsert.run(documentId, s);
        if (!res) {
          throw Object.assign(new Error("Sentence insert returned no result"), {
            _reason: "SENTENCE_INSERT_FAILED",
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
  } catch (e: unknown) {
    console.log(e);
    // Map better-sqlite3/SQLite errors to descriptive results
    const err = e as { code?: string; message?: string; _reason?: string };
    const code = err.code;
    const msg = err.message;
    const reason = err._reason;

    // Broaden detection for UNIQUE constraint on documents.title
    const isUniqueTitleViolation =
      (code?.startsWith("SQLITE_CONSTRAINT") ?? false) &&
      (msg?.includes("UNIQUE constraint failed: documents.title") ||
        msg?.includes("documents.title"));

    if (isUniqueTitleViolation) {
      return {
        ok: false,
        code: "DOCUMENT_ALREADY_EXISTS",
        message:
          "A document with this file name already exists. Rename the file and try again.",
        details: msg,
      };
    }

    if (reason === "DOCUMENT_INSERT_FAILED") {
      return {
        ok: false,
        code: "DOCUMENT_INSERT_FAILED",
        message: "Failed to create a document record in the database.",
        details: msg,
      };
    }

    if (reason === "SENTENCE_INSERT_FAILED") {
      return {
        ok: false,
        code: "SENTENCE_INSERT_FAILED",
        message: "Failed to insert one or more sentences into the database.",
        details: msg,
      };
    }

    return {
      ok: false,
      code: "DB_ERROR",
      message:
        "An unexpected database error occurred while importing sentences.",
      details: msg,
    };
  }
};
