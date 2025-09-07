"use client";
import React from "react";

export default function CssReadyGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const cssApplied = () => {
      try {
        const bg = getComputedStyle(document.body).backgroundColor;
        // Tailwind bg-gray-900 is rgb(17, 24, 39). If globals/tailwind
        // didn’t load, body background is typically white.
        return bg && bg !== "rgb(255, 255, 255)";
      } catch {
        return false;
      }
    };

    if (cssApplied()) {
      setReady(true);
      return;
    }

    const start = Date.now();
    const timer = setInterval(() => {
      if (cancelled) return;
      if (cssApplied() || Date.now() - start > 5000) {
        clearInterval(timer);
        setReady(true);
      }
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Use display: contents to avoid introducing an extra wrapper element
  // that could affect flex layouts in the app shell.
  return (
    <div style={{ display: ready ? "contents" as const : "none" }}>{children}</div>
  );
}
