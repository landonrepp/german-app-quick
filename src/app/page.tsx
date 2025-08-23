import FileUploader from "@/components/FileUploader";

export default function Home() {
  return (
    <div className="m-3">
      <h1 className="text-white text-3xl">Lang App</h1>
      <div className="m-4">
        <FileUploader/>
      </div>
    </div>
  );
}
