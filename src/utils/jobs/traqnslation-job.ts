let isRunning = false;

export const translateSentences = async (sentences: Sentence[]) => {
    if (isRunning) return;
    isRunning = true;

    try {
        for (const sentence of sentences) {
            await translateSentence(sentence);
        }
    } finally {
        isRunning = false;
    }
}

const translateSentence = async (sentence: Sentence) => {
    
}