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
    isKnown: boolean
}

export const getSentences = async () => {
    const sentences = await database
        .prepare<unknown[], SentenceRec>(`
            SELECT content, s.id, w.word, w.id as wordId, iif(k.word IS NOT NULL, 1, 0) as isKnown
            FROM sentences s 
            INNER JOIN words_in_sentences w 
            ON s.id = w.sentence_id
            LEFT JOIN known_words k
            ON w.word = k.word
        `)
        .all();
    
    const sentencesMap: any = {}; //TODO: figure out how to represent hashmaps
    sentences.forEach(sentenceRec => {
        if (!sentencesMap[sentenceRec.id]) {
            const sentence: Sentence = {
                content: sentenceRec.content,
                id: sentenceRec.id,
                words: [],
                numUnknownWords: 0
            }

            sentencesMap[sentenceRec.id] = sentence;
        }

        const rec: Sentence = sentencesMap[sentenceRec.id];

        rec.words.push({
            word: sentenceRec.word,
            id: sentenceRec.wordId,
            isKnown: sentenceRec.isKnown
        });
        
        if (!sentenceRec.isKnown) {
            rec.numUnknownWords += 1;
        }
    })
    return Object.values(sentencesMap) as Sentence[];
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