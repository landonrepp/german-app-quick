"use client";
import { importSentences } from "@/utils/db";
import { getGermanSentences } from "@/utils/fileReader";
import React, { useEffect } from "react";

type FileUploadResult =
    {
      result: "SUCCESS";
    }
  | {
      result: "ERROR";
      error: string;
    };

export default function FileUploader() {
  const [importResult, setImportResult] =
    React.useState<FileUploadResult | null>(null);

  const onInputChange = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    (async () => {
      const files = evt.target.files ? Array.from(evt.target.files) : [];
      if (!files.length) return;

      const file = files[0];
      // Only allow text/plain
      if (file.type !== "text/plain") {
        setError("Only text files are allowed");
        return;
      }

      try {
        // Use File.text() when available; fallback for environments without it
        const text =
          typeof (file as any).text === "function"
            ? await(file as any).text()
            : await new Response(file).text();
        setImportResult(text);

        const sentences = getGermanSentences({
          fileContent: text,
          fileName: file.name,
        });

        importSentences({
          fileName: file.name,
          content: text,
          sentences,
        });
      } catch (e) {
        setImportResult("ERROR");
        setError("Failed to read file");
      }
    })();
  };

  useEffect(() => {
    return () => {
      setImportResult(null);
      setError("");
    };
  }, []);

  return (
    <form>
      <input
        onChange={onInputChange}
        type="file"
        id="fileUpload"
        className="hidden"
        accept="text/plain"
      />
      <label htmlFor="fileUpload" className="border-2 p-2 rounded-md">
        Choose a file to sentence mine
      </label>
      {error && (
        <p role="alert" className="mt-2 text-red-600">
          {error}
        </p>
      )}
      {importResult && (
        <pre className="mt-2 whitespace-pre-wrap">{importResult}</pre>
      )}
    </form>
  );
}
