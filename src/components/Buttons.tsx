"use client";

import { addKnownSentence, createAnkiCard, Sentence } from "@/utils/miningDao";
import { useRouter } from "next/navigation";

export type AddButtonProps = { sentence: Sentence };

export function AddButton({ sentence }: AddButtonProps) {
  const router = useRouter();

  const handleClick = async () => {
    await createAnkiCard(sentence);
    await addKnownSentence(sentence);
    await router.refresh();
  };

  return (
    <button
      className="bg-blue-500 text-white p-2 rounded-md cursor-pointer"
      onClick={handleClick}
      aria-label="Add Anki card and mark known"
      title="Add Anki card and mark known"
    >
      +
    </button>
  );
}

export type IKnowThisButtonProps = {
  sentence: Sentence;
};

export function IKnowThisButton({ sentence }: IKnowThisButtonProps) {
  const router = useRouter();

  const handleClick = async () => {
    await addKnownSentence(sentence);
    await router.refresh();
  };

  return (
    <button
      className="bg-green-500 text-white p-2 rounded-md cursor-pointer"
      onClick={handleClick}
      aria-label="Mark all words known"
      title="Mark all words known"
    >
      &#10003;
    </button>
  );
}
