import { ImageResponse } from "next/og";

export const runtime = "edge";

const OG_CACHE_CONTROL = "public, immutable, no-transform, max-age=31536000";

function sanitizeText(value: string | null, fallback: string, maxLength: number) {
  const cleaned = Array.from(value ?? "")
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      const isControl = code < 0x20 || (code >= 0x7f && code <= 0x9f);
      const isZeroWidthOrBidi =
        (code >= 0x200b && code <= 0x200f) ||
        (code >= 0x202a && code <= 0x202e) ||
        (code >= 0x2066 && code <= 0x2069) ||
        code === 0xfeff;

      return isControl || isZeroWidthOrBidi ? " " : char;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  return (cleaned || fallback).slice(0, maxLength);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const title = sanitizeText(searchParams.get("title"), "VeriWorkly", 120);

    const showDescription = searchParams.get("showDesc") !== "false";
    const theme = searchParams.get("theme") === "dark" ? "dark" : "light";

    const isDark = theme === "dark";

    const MARK_PATH =
      "M66 117H156l57.2 137.6L236.1 200h39.8l22.9 54.6L356 117h90L322 395h-35.6L256 324l-30.4 71H190Z";

    const t = isDark
      ? {
          background: "#0d1117",
          foreground: "#f3f4f6",
          muted: "#94a3b8",
          grid: "rgba(148, 163, 184, 0.07)",
          chipFill: "rgba(148, 163, 184, 0.1)",
          chipBorder: "rgba(148, 163, 184, 0.25)",
        }
      : {
          background: "#f5f4ef",
          foreground: "#171717",
          muted: "#5f5c54",
          grid: "rgba(23, 23, 23, 0.05)",
          chipFill: "rgba(23, 23, 23, 0.05)",
          chipBorder: "rgba(23, 23, 23, 0.12)",
        };

    const displayDescription = sanitizeText(
      searchParams.get("description"),
      "Building the future of professional resumes, one sync at a time.",
      250,
    );

    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          color: t.foreground,
          alignItems: "center",
          position: "relative",
          flexDirection: "column",
          fontFamily: "sans-serif",
          justifyContent: "center",
          backgroundColor: t.background,
        }}
      >
        <div
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            position: "absolute",
            backgroundImage: isDark
              ? "radial-gradient(circle at top left, rgba(37, 99, 235, 0.2), transparent 40%)"
              : "radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 28%)",
          }}
        />

        <div
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            position: "absolute",
            backgroundImage: isDark
              ? "radial-gradient(circle at top right, rgba(96, 165, 250, 0.15), transparent 30%)"
              : "radial-gradient(circle at top right, rgba(96, 165, 250, 0.08), transparent 22%)",
          }}
        />

        <svg
          style={{
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            position: "absolute",
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke={t.grid} strokeWidth="1" />
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
              fontWeight: 600,
              marginBottom: 48,
              display: "flex",
              padding: "6px 12px",
              alignItems: "center",
              borderRadius: "100px",
              backgroundColor: t.chipFill,
              border: `1px solid ${t.chipBorder}`,
            }}
          >
            <svg
              width={34}
              height={34}
              fill={t.foreground}
              viewBox="0 0 512 512"
              style={{ marginRight: 10 }}
            >
              <path d={MARK_PATH} />
              <circle cx="256" cy="381.8" r="12.3" />
            </svg>
            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>VeriWorkly</span>
          </div>

          <div
            style={{
              fontWeight: 900,
              display: "flex",
              lineHeight: 1.05,
              maxWidth: "1100px",
              letterSpacing: "-0.05em",
              fontSize: title.length > 40 ? 60 : 84,
              marginBottom: showDescription ? 32 : 0,
              backgroundImage: `linear-gradient(to bottom, ${t.foreground}, ${t.muted})`,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {title}
          </div>

          {showDescription && (
            <div
              style={{
                fontSize: 32,
                color: t.muted,
                lineHeight: 1.4,
                fontWeight: 500,
                display: "flex",
                maxWidth: "850px",
              }}
            >
              {displayDescription}
            </div>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 40,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            opacity: 0.5,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          veriworkly.com
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": OG_CACHE_CONTROL,
        },
      },
    );
  } catch (err) {
    console.error("Failed to generate OG image:", err);

    return new Response("Error generating image", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
