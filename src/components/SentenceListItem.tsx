"use client";

import { addKnownWord, Sentence, Word } from "@/utils/miningDao";
import { useRouter } from "next/navigation";

export type SentenceListItemProps = {
  sentence: Sentence;
};



export function SentenceListItem({
  sentence,
}: SentenceListItemProps) {

  return (
    <div>
      {sentence.words.map((word) => {
        return (
          <WordListItem key={word.id} word={word} ></WordListItem>
        );
      })}
    </div>
  );
}

function WordListItem({ word }: { word: Word }) {
  const router = useRouter();
  const handleClick = async (word: Word) => {
    await addKnownWord(word);
    router.refresh();
  };
  return (
    <span
      className={`mr-1 select-none 
        ${
          !word.isKnown &&
          "hover:border-white hover:rounded-md hover:border-2 cursor-pointer"
        }  
        ${word.isKnown && "text-gray-200 italic"}
        `}
      onClick={() => handleClick(word)}
    >
      {word.word}
    </span>
  );
}
