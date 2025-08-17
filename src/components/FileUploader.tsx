"use client";
import { importSentences } from "@/utils/db";
import { getGermanSentences } from "@/utils/fileReader";
import React, { useEffect } from "react";

type FileUploadResult =
    { result: "LOADING" }
  | { result: "SUCCESS" /* optionally add a message later if needed */ }
  | { result: "ALREADY_UPLOADED" } // <- added
  | { result: "ERROR"; error: string };

export default function FileUploader() {
  const [importResult, setImportResult] =
    React.useState<FileUploadResult | null>(null);

  const onInputChange = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const files = evt.target.files ? Array.from(evt.target.files) : [];
    if (!files.length) return;

    const file = files[0];
    if (file.type !== "text/plain") {
      setImportResult({
        result: "ERROR",
        error: "Unsupported file type. Please upload a plain text (.txt) file.",
      });
      return;
    }

    setImportResult({ result: "LOADING" });

    let text: string;
    try {
      text =
        typeof (file as any).text === "function"
          ? await (file as any).text()
          : await new Response(file).text();
    } catch (e: any) {
      setImportResult({
        result: "ERROR",
        error: "Unable to read the file. Please try again.",
      });
      return;
    }

    let sentences: string[];
    try {
      sentences = getGermanSentences({
        fileContent: text,
        fileName: file.name,
      });
    } catch (e: any) {
      const msg = String(e?.message || "");
      let friendly =
        "Failed to analyze the file and detect sentences. Please try again.";
      if (msg.includes("Unsupported file type")) {
        friendly =
          "Unsupported file extension. Only .txt files are supported.";
      } else if (msg.includes("Failed to parse file")) {
        friendly = "Could not parse the file content.";
      }
      setImportResult({ result: "ERROR", error: friendly });
      return;
    }

    const res = await importSentences({
      fileName: file.name,
      content: text,
      sentences,
    });

    if (!res.ok) {
      let friendly = res.message;
      switch (res.code) {
        case "NO_SENTENCES":
          friendly =
            "No German sentences were detected in the file. Nothing was imported.";
          break;
        case "DOCUMENT_ALREADY_EXISTS":
          // Set dedicated state and stop further processing
          setImportResult({ result: "ALREADY_UPLOADED" });
          return;
        case "DOCUMENT_INSERT_FAILED":
          friendly = "Failed to create a document record in the database.";
          break;
        case "SENTENCE_INSERT_FAILED":
          friendly =
            "Failed to insert one or more sentences into the database.";
          break;
        case "DB_ERROR":
        default:
          friendly =
            "An unexpected database error occurred while importing sentences.";
          break;
      }
      setImportResult({ result: "ERROR", error: friendly });
      return;
    }

    setImportResult({ result: "SUCCESS" });
  };

  useEffect(() => {
    return () => {
      setImportResult(null);
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
        disabled={importResult?.result === "LOADING"}
      />
      <label htmlFor="fileUpload" className="border-2 p-2 rounded-md cursor-pointer">
        Choose a file to sentence mine
      </label>

      {importResult?.result === "LOADING" && (
        <p className="mt-2 text-gray-600">Uploading...</p>
      )}
      {importResult?.result === "ALREADY_UPLOADED" && (
        <p role="alert" className="mt-2 text-red-600">
          A document with this file name already exists. Rename the file and try again.
        </p>
      )}
      {importResult?.result === "ERROR" && (
        <p role="alert" className="mt-2 text-red-600">
          {importResult.error}
        </p>
      )}
      {importResult?.result === "SUCCESS" && (
        <p className="mt-2 text-green-600">File uploaded successfully</p>
      )}
    </form>
  );
}
