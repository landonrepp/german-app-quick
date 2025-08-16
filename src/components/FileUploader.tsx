"use client";

import React, { ReactNode, useState } from "react";

export default function FileUploader({ children }: { children: ReactNode }) {
  const [dragging, setDragging] = useState(false);

  const handleDrag = (evt: React.DragEvent<HTMLDivElement>) => {
    evt.preventDefault(); // allow drop
    evt.stopPropagation();
    console.log("dragging");
    setDragging(true);
  };

  const handleDrop = (evt: React.DragEvent<HTMLDivElement>) => {
    evt.preventDefault();
    evt.stopPropagation();
    console.log("dropped");
    setDragging(false);
  };

  const handleDragLeave = (evt: React.DragEvent<HTMLDivElement>) => {
    evt.stopPropagation();
    evt.preventDefault();

    console.log("exit");
    setDragging(false);
  };

  return (
    <div
      className="p-0 m-0 h-full w-full"
      onDragLeave={handleDragLeave}
      onDragEnter={handleDrag}
      onDragOver={e => e.preventDefault()}
    >
      {dragging ? (
        <>
          <div
            className="pointer-events-none absolute opacity-10 bg-white h-full w-full flex flex-row justify-center"
          >
            <div className="flex flex-col justify-center">
              <div className="h-fit">dragging</div>
            </div>
          </div>
        </>
      ) : (
        <></>
      )}
      <div className="">{children}</div>
    </div>
  );
}
