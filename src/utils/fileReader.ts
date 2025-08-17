import { JSDOM } from "jsdom";
import { detect_languages } from "lang-detection";


type LanguageResults = "German" | "English" | "Unknown";

const SUPPORTED_FILE_TYPES = ["txt"];

export function getGermanSentences({
  fileContent: fileBuffer,
  fileName,
}: {
  fileContent: string;
  fileName: string;
}): string[] {
  const sentences = getSentences(fileBuffer, fileName);
  const languageResults = detect_languages(sentences) as LanguageResults[];

  return sentences.filter((_, index) => languageResults[index] === "German");
}



function getSentences(fileBuffer: string, fileName: string): string[] {
  let text: string | null = null;
  const fileType = fileName.split(".").pop();
  if (!fileType || !SUPPORTED_FILE_TYPES.includes(fileType)) {
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  if (fileType === "txt") {
    text = fileBuffer;
  }

  if (!text) {
    throw new Error("Failed to parse file");
  }

  const sentences = text
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .split(/((?<=[.!?])\s+)(?![^\[]]*\])(?![^\{}]]*\})(?![^\()]]*\))/)
    .filter(sentenceIsValid);

  return sentences;
}

const sentenceIsValid = (sentence: string) => {
  if(sentence == null) {
    return false;
  }
  const words = sentence.split(" ").filter((word) => word.length > 0);
  return words.length > 3 && words.length < 30;
}