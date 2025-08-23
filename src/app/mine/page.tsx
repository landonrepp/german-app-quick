"use server"

import { AddButton, IKnowThisButton } from "@/components/Buttons";
import { SentenceListItem } from "@/components/SentenceListItem";
import {getSentences} from '@/utils/miningDao';

type PageState =
  | {
      state: "LOADING";
    }
  | {
      state: "READY";
      sentences: string[];
    }
  | {
      state: "ERROR";
      message: string;
    };

export default async function Page() {

  // Simulate a READY state for demonstration
  const sentences = await getSentences();

  return (
    <div className="flex flex-row justify-center w-full">
      <div className="w-full">
        <h1 className="text-2xl">Sentence Mining</h1>
        <table className="w-full my-6 *:border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="">{/* placeholder for button column */}</th>
              <th className="p-4">Sentences</th>
            </tr>
          </thead>
          <tbody className="flex-1 overflow-auto min-h-0">
            {sentences.map((sentence) => (
              <tr className="border-t-1 border-green-50 min-w-fit" key={sentence.id}>
                <td className="border-r-2 border-green-50 p-2">
                  <div className="flex flex-row gap-2">
                    <AddButton />
                    <IKnowThisButton />
                    </div>
                  </td>
                  <td className="w-full p-2">
                    <SentenceListItem sentence={sentence} />
                    {/* TODO: add virtual scrolling here */}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
