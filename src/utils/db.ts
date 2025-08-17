import Database from 'better-sqlite3';
const database = new Database('./db.sqlite', { verbose: console.log });
import fs from 'fs';

const init  = async () => {
    'use server';

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
}

await init();