import { Suspense } from "react";
import { getAnkiCards } from "@/utils/miningDao";
import AnkiBackCell from "@/components/AnkiBackCell";

export default async function ExportPage() {
  const cards = await getAnkiCards();
  return (
    <div className="flex flex-row justify-center w-full">
      <div className="w-full px-3 sm:px-4">
        <h1 className="text-2xl">Export to Anki</h1>
        <div className="w-full overflow-x-auto my-6">
          <table className="table-auto w-full border border-gray-300">
            <thead>
              <tr>
                <th className="p-2 text-left border-b border-gray-300">Front</th>
                <th className="p-2 text-left border-b border-gray-300">Back</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.id} className="border-t border-gray-300">
                  <td className="p-2 align-top whitespace-pre-wrap break-words">{c.front}</td>
                  <td className="p-2 align-top whitespace-pre-wrap break-words border-l border-gray-300">
                    <Suspense fallback={"..."}>
                      {/* @ts-expect-error Server Component */}
                      <AnkiBackCell id={c.id} />
                    </Suspense>
                  </td>
                  
                </tr>
              ))}
              {cards.length === 0 && (
                <tr>
                  <td colSpan={2} className="p-4 text-center text-gray-500">No cards yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
