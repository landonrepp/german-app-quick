import AnkiExportTable from "@/components/AnkiExportTable";
import ExportButton from "@/components/ExportButton";

export default async function ExportPage() {
  return (
    <div className="flex flex-row justify-center w-full">
      <div className="w-full px-3 sm:px-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl">Export to Anki</h1>
          <div className="self-start">
            <ExportButton />
          </div>
        </div>
        <AnkiExportTable />
      </div>
    </div>
  );
}
