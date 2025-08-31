import AnkiExportTable from "@/components/AnkiExportTable";

export default async function ExportPage() {
  return (
    <div className="flex flex-row justify-center w-full">
      <div className="w-full px-3 sm:px-4">
        <h1 className="text-2xl">Export to Anki</h1>
        <AnkiExportTable />
      </div>
    </div>
  );
}
