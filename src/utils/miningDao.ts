"use server";

import { getDatabase } from '@/utils/db';


const database = await getDatabase();

export type Word = {
    word: string,
    id: number
}

export type Sentence = {
    content: string,
    id: number
    words: Word[];
}

export type SentenceWithKnownWords = {
    sentence: Sentence,
    knownWords: string[];
}

type SentenceRec = {
    content: string,
    id: number,
    word: string,
    wordId: number
}

export const getSentences = async () => {
    const sentences = await database
        .prepare<unknown[], SentenceRec>(`
            SELECT content, s.id, word, w.id as wordId 
            FROM sentences s 
            INNER JOIN words_in_sentences w 
            ON s.id = w.sentence_id
        `)
        .all();
    
    const sentencesMap: any = {}; //TODO: figure out how to represent hashmaps
    sentences.forEach(sentenceRec => {
        if (!sentencesMap[sentenceRec.id]) {
            const sentence: Sentence = {
                content: sentenceRec.content,
                id: sentenceRec.id,
                words: []
            }

            sentencesMap[sentenceRec.id] = sentence;
        }

        const rec: Sentence = sentencesMap[sentenceRec.id];

        rec.words.push({
            word: sentenceRec.word,
            id: sentenceRec.wordId
        });
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