"use client";

import { addKnownWord, Sentence } from "@/utils/miningDao";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export type SentenceListItemProps = {
  sentence: Sentence;
};



export function SentenceListItem({
  sentence,
}: SentenceListItemProps) {

  return (
    <div>
      {sentence.words.map((word, index) => {
        return (
          <WordListItem key={word.id} word={word.word} isKnown={word.isKnown} />
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
