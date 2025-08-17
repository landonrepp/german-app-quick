"use client";

import { AddButton, IKnowThisButton } from "@/components/Buttons";
import { useEffect, useState } from "react";

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

export default function Page() {
  const [pageState, setPageState] = useState<PageState>({ state: "LOADING" });

  useEffect(() => {
    // TODO: add db call here
    setTimeout(() => {
      setPageState({
        state: "READY",
        sentences: ["Ich liebe Programmieren.", "React ist großartig."],
      });
    }, 1000);
  }, []);

  return (
    <div className="flex flex-row justify-center w-full">
      <div className="w-full">
        <h1 className="text-2xl">Sentence Mining</h1>
        <table className="w-full my-6 *:border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="">{/* placeholder for button column */}</th>
              <th className="">Sentence</th>
            </tr>
          </thead>
          <tbody>
            {pageState.state === "LOADING" && (
              <tr>
                <td colSpan={2}>Loading...</td>
              </tr>
            )}
            {pageState.state === "ERROR" && (
              <tr>
                <td colSpan={2}>{pageState.message}</td>
              </tr>
            )}
            {pageState.state === "READY" &&
              pageState.sentences.map((sentence) => (
                <tr className="border-t-1 border-green-50 min-w-fit" key={sentence}>
                  <td className="border-r-2 border-green-50 p-2">
                    <div className="flex flex-row gap-2">
                      <AddButton />
                      <IKnowThisButton />
                    </div>
                  </td>
                  <td className="w-full p-2">
                    {sentence}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
