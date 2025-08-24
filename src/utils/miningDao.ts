"use server";

import { getDatabase } from '@/utils/db';


const database = await getDatabase();

export type Word = {
    word: string,
    id: number,
    isKnown: boolean
}

export type Sentence = {
    content: string,
    id: number
    words: Word[],
    numUnknownWords: number
}

type SentenceRec = {
    content: string,
    id: number,
    word: string,
    wordId: number,
    isKnown: number, // from SQL (0/1)
    unknownCount: number
}

export const getSentences = async () => {
    const sentences = await database
        .prepare<unknown[], SentenceRec>(`
            SELECT 
                s.content, 
                s.id, 
                w.word, 
                w.id AS wordId, 
                iif(k.word IS NOT NULL, 1, 0) AS isKnown,
                u.unknownCount
            FROM sentences s 
            INNER JOIN words_in_sentences w 
                ON s.id = w.sentence_id
            LEFT JOIN known_words k
                ON w.word = k.word
            LEFT JOIN (
                SELECT 
                    w2.sentence_id, 
                    COUNT(*) AS unknownCount
                FROM words_in_sentences w2
                LEFT JOIN known_words k2
                    ON w2.word = k2.word
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
            isKnown: !!sentenceRec.isKnown
        });
        
    })
    const result = (Object.values(sentencesMap) as Sentence[])
        .sort((a, b) => a.numUnknownWords - b.numUnknownWords);
    
    return result;
}

export const addKnownWord = async (word: string) => {
    const statement = database.prepare(`
        INSERT INTO known_words (word) 
        VALUES (?)
        ON CONFLICT(word) DO NOTHING
    `);
    await statement.run([word]);
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