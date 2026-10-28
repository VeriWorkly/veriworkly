import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

type OgCard = {
  title: string;
  description: string;
  label: string;
  footer: string;
};

const logo = readFile(path.join(process.cwd(), "public", "veriworkly-logo.png")).then(
  (buffer) => `data:image/png;base64,${buffer.toString("base64")}`,
);

/** The 1200×630 social card for a post. */
export async function renderOgCard({ title, description, label, footer }: OgCard) {
  const logoSrc = await logo;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        position: "relative",
        flexDirection: "column",
        fontFamily: "sans-serif",
        justifyContent: "center",
        color: "#171717",
        backgroundColor: "#f5f4ef",
      }}
    >
      <div
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          position: "absolute",
          backgroundImage:
            "radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 28%)",
        }}
      />

      <div
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          position: "absolute",
          backgroundImage:
            "radial-gradient(circle at top right, rgba(96, 165, 250, 0.08), transparent 22%)",
        }}
      />

      <svg
        style={{ top: 0, left: 0, width: "100%", height: "100%", position: "absolute" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path
              d="M 16 0 L 0 0 0 16"
              fill="none"
              stroke="rgba(23, 23, 23, 0.035)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <div
        style={{
          display: "flex",
          padding: "80px",
          textAlign: "center",
          alignItems: "center",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 24,
            display: "flex",
            fontWeight: 600,
            marginBottom: 48,
            alignItems: "center",
            padding: "6px 12px",
            borderRadius: "100px",
            backgroundColor: "rgba(0,0,0,0.05)",
            border: "1px solid rgba(0,0,0,0.07)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={38} height={38} alt="" style={{ marginRight: 10 }} />
          <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{label}</span>
        </div>

        <div
          style={{
            fontWeight: 900,
            display: "flex",
            lineHeight: 1.05,
            maxWidth: "1100px",
            color: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.05em",
            fontSize: title.length > 40 ? 60 : 84,
            marginBottom: 32,
            backgroundImage: "linear-gradient(to bottom, #000000, #4b5563)",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: 32,
            display: "flex",
            lineHeight: 1.4,
            fontWeight: 500,
            maxWidth: "850px",
            color: "#4b5563",
          }}
        >
          {description}
        </div>
      </div>

      <div
        style={{
          bottom: 40,
          opacity: 0.5,
          fontSize: 18,
          width: "100%",
          display: "flex",
          fontWeight: 700,
          position: "absolute",
          letterSpacing: "0.2em",
          justifyContent: "center",
          textTransform: "uppercase",
        }}
      >
        {footer}
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
