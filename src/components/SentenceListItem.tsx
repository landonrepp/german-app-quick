"use client";

import { addKnownWord, Sentence } from "@/utils/miningDao";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export type SentenceListItemProps = {
  sentence: Sentence;
  knownWords: Record<string, boolean>;
};

type WordWithKnownStatus = {
  word: string;
  isKnown: boolean;
};

export function SentenceListItem({
  sentence,
  knownWords,
}: SentenceListItemProps) {
  const words = useMemo(() => {
    const wordStrs = sentence.content.split(" ");
    console.log(knownWords);
    return wordStrs.map((word) => ({
      word,
      isKnown: knownWords[word] || false,
    }));
  }, [sentence.content, knownWords]);

  return (
    <div>
      {words.map((word, index) => {
        return (
          <WordListItem key={index} word={word.word} isKnown={word.isKnown} />
        );
      })}
    </div>
  );
}

function WordListItem({ word, isKnown }: { word: string; isKnown: boolean }) {
  const router = useRouter();
  const handleClick = async (word: string) => {
    await addKnownWord(word);
    router.refresh();
  };
  return (
    <span
      className={`mr-1 select-none 
        ${
          !isKnown &&
          "hover:border-white hover:rounded-md hover:border-2 cursor-pointer"
        }  
        ${isKnown && "text-gray-200 italic"}
        `}
      onClick={() => handleClick(word)}
    >
      {word}
    </span>
  );
}
