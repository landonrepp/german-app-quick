"use server";

import { getDatabase } from '@/utils/db';


const database = await getDatabase();

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
    const sentences = await database
        .prepare<unknown[], SentenceRec>(`
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
        .all();
    
    const sentencesMap: any = {}; //TODO: figure out how to represent hashmaps
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

    const vals = arr.map(x => "(?)").join(',');

    const statement = database.prepare(`
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
    const statement = database.prepare(`
        INSERT INTO known_words (word) 
        VALUES ${word.map(() => "(?)").join(',')}
        ON CONFLICT(word) DO NOTHING
    `);
    await statement.run(word.map(w => w.cleanedWord));
}

export const getKnownWords = async () => {
    const words = await database
        .prepare<unknown[], { word: string }>(`
            SELECT word FROM known_words
        `)
        .all();
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

    const statement = database.prepare(`
        INSERT INTO anki_cards (unknown_words, front, back)
        VALUES (?, ?, ?)
        ON CONFLICT(front) DO NOTHING
    `);
    await statement.run(JSON.stringify(unknownWords), sentence.content, "");
}

export const getAnkiCards = async (): Promise<AnkiCard[]> => {
    return database
        .prepare<unknown[], AnkiCard>(
            `SELECT id, front, back, unknown_words, created_at FROM anki_cards ORDER BY id DESC`
        )
        .all();
}

// Unknown word selection removed; using stored JSON on anki_cards.unknown_words only.
