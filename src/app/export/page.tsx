export default function ExportPage() {
  return (
      <div className="flex flex-row justify-center w-full">
        <div className="w-full">
          <h1 className="text-2xl">Sentence Mining</h1>
          <table className="table-fixed w-full my-6 *:border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="w-16">{/* placeholder for button column */}</th>
                <th className="p-4 w-[calc((100%-4rem)/2)]">Front</th>
                <th className="p-4 text-nowrap w-[calc((100%-4rem)/2)]">Back</th>
              </tr>
            </thead>
            <tbody className="flex-1 overflow-auto min-h-0">
              {["tew", "fjewoi"].splice(0, 10).map((sentence) => (
                <tr
                  className="border-t-1 border-green-50 min-w-fit"
                  key={sentence}
                >
                  <td className="border-r-2 border-green-50 p-2 w-16">
                    <div className="flex flex-row gap-2">
                    </div>
                  </td>
                  <td className="p-2 w-[calc((100%-4rem)/2)]">
                    {sentence}
                  </td>
                  <td className="px-2 border-l-2 border-l-white border-collapse w-[calc((100%-4rem)/2)]">
                    <div className="flex justify-center items-center h-full">
                      {sentence}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
}