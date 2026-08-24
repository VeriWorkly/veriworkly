"use client";

import Link from "next/link";
import { useEffect } from "react";

const GlobalError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    console.error("Global error boundary caught error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: "24px",
          display: "flex",
          color: "#171717",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f4ef",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            body { background-color: #0d1117 !important; color: #f3f4f6 !important; }
            .vw-ge-muted { color: #94a3b8 !important; }
            .vw-ge-button { background-color: #60a5fa !important; color: #0f172a !important; }
            .vw-ge-link { color: #60a5fa !important; }
          }
          .vw-ge-button:focus-visible, .vw-ge-link:focus-visible {
            outline: 2px solid #2563eb;
            outline-offset: 2px;
          }
        `}</style>

        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontWeight: 700,
              color: "#dc2626",
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Application Error
          </p>

          <h1
            style={{
              fontWeight: 700,
              margin: "1rem 0 0",
              letterSpacing: "-0.02em",
              fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
            }}
          >
            This page couldn&rsquo;t load
          </h1>

          <p
            className="vw-ge-muted"
            style={{ margin: "1rem 0 0", lineHeight: 1.7, color: "#5f5c54" }}
          >
            Something failed before the page could start. This is usually temporary — trying again
            often resolves it.
          </p>

          {error.digest && (
            <p
              className="vw-ge-muted"
              style={{
                color: "#5f5c54",
                fontSize: "0.75rem",
                margin: "1.5rem 0 0",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              Reference: {error.digest}
            </p>
          )}

          <div
            style={{
              gap: "0.75rem",
              display: "flex",
              flexWrap: "wrap",
              marginTop: "2rem",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              className="vw-ge-button"
              style={{
                border: 0,
                fontWeight: 600,
                cursor: "pointer",
                color: "#ffffff",
                fontSize: "0.875rem",
                borderRadius: "9999px",
                padding: "0.75rem 2rem",
                backgroundColor: "#2563eb",
              }}
            >
              Try again
            </button>

            <Link
              href="/"
              className="vw-ge-link"
              style={{
                fontWeight: 600,
                color: "#2563eb",
                fontSize: "0.875rem",
                borderRadius: "9999px",
                textDecoration: "none",
                padding: "0.75rem 2rem",
              }}
            >
              Back to home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
};

export default GlobalError;
