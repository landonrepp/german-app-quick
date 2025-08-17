'use server';

import Database from 'better-sqlite3';
const database = new Database('./db.sqlite', { verbose: console.log });
import fs from 'fs';

(async () => {
    database.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `)

    // Prepare statements and a transaction to apply a migration atomically
    const selectMigration = database.prepare(`SELECT 1 FROM migrations WHERE name = ?`);
    const insertMigration = database.prepare(`INSERT INTO migrations (name) VALUES (?)`);
    const applyMigration = database.transaction((file: string, sql: string) => {
        database.exec(sql);
        insertMigration.run(file);
    });

    fs.readdirSync('./migrations').forEach(file => {
        const migration = selectMigration.get(file);
        if (migration) return;

        const sql = fs.readFileSync(`./migrations/${file}`, 'utf8');
        // Execute the migration and record it in a single transaction
        applyMigration(file, sql);
    });
})();

export const importSentences = async ({content, sentences, fileName}: {content: string, sentences: string[], fileName: string}) => {
    const documentInsert = database.prepare(`
        INSERT INTO documents (title, content) VALUES (?, ?)
    `);
    const documentInsertResult = documentInsert.run(fileName, content);
    if (!documentInsertResult) throw new Error('Failed to insert document');
    const documentId = documentInsertResult.lastInsertRowid;

    const sentenceInsert = database.prepare(`
        INSERT INTO sentences (document_id, content) VALUES (?, ?)
    `);
    sentences.forEach(sentence => {
        const sentenceInsertResult = sentenceInsert.run(documentId, sentence);
        if (!sentenceInsertResult) throw new Error('Failed to insert sentence');
    });
    console.log(`inserted ${sentences.length} sentences for document ${fileName}`);
}

