"use server";

import { getDatabase } from '@/utils/db';
import { emitCardUpdated } from '@/utils/events';


// Avoid caching the DB connection across hot-reloads/server action contexts.
// Always fetch via getDatabase() within functions.

export type Word = {
    word: string,
    cleanedWord: string,
    id: number,
    isKnown: boolean
}

export type Sentence = {
    content: string,
    id: number
    words: Word[],
    numUnknownWords: number
}

export type AnkiCard = {
    id: number,
    front: string,
    back: string,
    unknown_words?: string | null,
    created_at?: string | null
}

type SentenceRec = {
    content: string,
    id: number,
    word: string,
    wordId: number,
    isKnown: number, // from SQL (0/1)
    unknownCount: number,
    cleanedWord: string
}

export const getSentences = async () => {
    const db = await getDatabase();
    const sentences = await (db
        .prepare(`
            SELECT 
                s.content, 
                s.id, 
                w.word, 
                w.cleaned_word as cleanedWord,
                w.id AS wordId, 
                iif(k.word IS NOT NULL, 1, 0) AS isKnown,
                u.unknownCount
            FROM sentences s 
            INNER JOIN words_in_sentences w 
                ON s.id = w.sentence_id
            LEFT JOIN known_words k
                ON w.cleaned_word = k.word
            LEFT JOIN (
                SELECT 
                    w2.sentence_id, 
                    COUNT(*) AS unknownCount
                FROM words_in_sentences w2
                LEFT JOIN known_words k2
                    ON w2.cleaned_word = k2.word
                WHERE k2.word IS NULL
                GROUP BY w2.sentence_id
            ) u
                ON u.sentence_id = s.id
            WHERE unknownCount > 0
            ORDER BY unknownCount ASC
        `)
        .all()) as SentenceRec[];
    
    const sentencesMap: Record<number, Sentence> = {};
    sentences.forEach(sentenceRec => {
        if (!sentencesMap[sentenceRec.id]) {
            const sentence: Sentence = {
                content: sentenceRec.content,
                id: sentenceRec.id,
                words: [],
                numUnknownWords: sentenceRec.unknownCount ?? 0
            }
            sentencesMap[sentenceRec.id] = sentence;
        }

        const rec: Sentence = sentencesMap[sentenceRec.id];

        rec.words.push({
            word: sentenceRec.word,
            id: sentenceRec.wordId,
            isKnown: !!sentenceRec.isKnown,
            cleanedWord: sentenceRec.cleanedWord
        });
        
    })
    const result = (Object.values(sentencesMap) as Sentence[])
        .sort((a, b) => a.numUnknownWords - b.numUnknownWords);
    
    return result;
}

export const addKnownSentence = async (sentence: Sentence) => {
    const arr = sentence.words
        .filter(x => !x.isKnown)
        .map(x => x.cleanedWord);

    if (arr.length === 0) return;

    const vals = arr.map(() => "(?)").join(',');

    const db = await getDatabase();
    const statement = db.prepare(`
        INSERT INTO known_words (word) 
        VALUES ${vals}
        ON CONFLICT(word) DO NOTHING
    `);
    await statement.run(arr);
}

export const addKnownWord = async (word: Word) => {
    return addKnownWords([word]);
}

export const addKnownWords = async (word: Word[]) => {
    const db = await getDatabase();
    const statement = db.prepare(`
        INSERT INTO known_words (word) 
        VALUES ${word.map(() => "(?)").join(',')}
        ON CONFLICT(word) DO NOTHING
    `);
    await statement.run(word.map(w => w.cleanedWord));
}

export const getKnownWords = async () => {
    const db = await getDatabase();
    const words = await (db
        .prepare(`
            SELECT word FROM known_words
        `)
        .all()) as { word: string }[];
    const knownWords =  words.map(row => row.word);

    const knownWordsMap: Record<string, boolean> = {};
    knownWords.forEach(word => {
        knownWordsMap[word] = true;
    });
    return knownWordsMap;
}

export const createAnkiCard = async (sentence: Sentence) => {
    // Per migrations/0001_init.sql: anki_cards has columns
    // (id, unknown_words TEXT NOT NULL, front TEXT NOT NULL, back TEXT NOT NULL, created_at)
    const unknownWords = sentence.words
        .filter(word => !word.isKnown)
        .map(word => word.cleanedWord);

    const db = await getDatabase();
    const statement = db.prepare(`
        INSERT INTO anki_cards (unknown_words, front, back)
        VALUES (?, ?, ?)
        ON CONFLICT(front) DO NOTHING
    `);
    await statement.run(JSON.stringify(unknownWords), sentence.content, "");
}

export const getAnkiCards = async (): Promise<AnkiCard[]> => {
    const db = await getDatabase();
    return (db
        .prepare(
            `SELECT id, front, back, unknown_words, created_at
             FROM anki_cards
             WHERE exported_at IS NULL
             ORDER BY id DESC`
        )
        .all()) as AnkiCard[];
}

// Unknown word selection removed; using stored JSON on anki_cards.unknown_words only.

export const updateAnkiFront = async (id: number, front: string) => {
    const db = await getDatabase();
    const stmt = db.prepare(`UPDATE anki_cards SET front = ? WHERE id = ?`);
    await stmt.run(front, id);
}

export const updateAnkiBack = async (id: number, back: string) => {
    const db = await getDatabase();
    const stmt = db.prepare(`UPDATE anki_cards SET back = ? WHERE id = ?`);
    await stmt.run(back, id);
    // Notify any server-side listeners (e.g., Suspense cells) that this card updated
    emitCardUpdated(id);
}

export const getAnkiCardById = async (id: number): Promise<AnkiCard | null> => {
    const db = await getDatabase();
    const row = (db
        .prepare(
            `SELECT id, front, back, unknown_words, created_at FROM anki_cards WHERE id = ?`
        )
        .get(id)) as AnkiCard | undefined;
    return row ?? null;
}

export const markAnkiCardsExported = async (ids: number[]) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`
        UPDATE anki_cards
        SET exported_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders})
          AND exported_at IS NULL
    `);
    stmt.run(...ids);
}
