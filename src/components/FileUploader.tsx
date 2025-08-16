"use client";
import React from 'react';

export default function FileUploader() {
  const [content, setContent] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");

  const onInputChange = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const files = evt.target.files ? Array.from(evt.target.files) : [];
    if (!files.length) return;

    const file = files[0];
    // Only allow text/plain
    if (file.type !== "text/plain") {
      setContent("");
      setError("Only text files are allowed");
      return;
    }

    try {
      // Use File.text() when available; fallback for environments without it
      const text = typeof (file as any).text === 'function'
        ? await (file as any).text()
        : await new Response(file).text();
      setError("");
      setContent(text);
    } catch (e) {
      setContent("");
      setError("Failed to read file");
    }
  };

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
      {content && (
        <pre className="mt-2 whitespace-pre-wrap">{content}</pre>
      )}
    </form>
  )
}