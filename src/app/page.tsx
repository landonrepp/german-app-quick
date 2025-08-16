import FileUploader from "@/components/FileUploader";

export default function Home() {
  return (
    <div className="bg-gray-900 w-screen h-screen">
      <FileUploader>
        <div>main content</div>
      </FileUploader>
    </div>
  );
}
