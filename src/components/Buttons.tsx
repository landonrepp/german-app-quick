"use client";

import { addKnownSentence, createAnkiCard, Sentence } from "@/utils/miningDao";
import { useRouter } from "next/navigation";
import router from "next/router";

export function AddButton() {
  const router = useRouter();

  const handleClick = async () => {
    await createAnkiCard(sentence);
    await router.refresh();
  };

  return (
    <button 
      className="bg-blue-500 text-white p-2 rounded-md cursor-pointer"
      onClick={handleClick}>
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
    >
      &#10003;
    </button>
  );
}