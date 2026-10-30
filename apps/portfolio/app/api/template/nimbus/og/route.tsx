import { ImageResponse } from "next/og";
import { OG_CACHE_HEADERS, ogCard, ogNotFound } from "@/lib/og-text";

export const runtime = "nodejs";

/**
 * Social card for Nimbus portfolios.
 *
 * `app/(published)/portfolios/[username]/[[...slug]]/page.tsx` builds this URL from the
 * portfolio's `templateId` unconditionally, but routes existed only for
 * `signal` and `atelier` — so every Nimbus portfolio without a custom social
 * image pointed its `og:image` at a 404 and shared with no preview card.
 *
 * Palette mirrors `template-library/nimbus/style.css` (Satori can't parse the
 * `oklch()` tokens used there, so these are the hex equivalents):
 *   --nimbus-paper  oklch(0.1 0 0)      → #0d0d0d
 *   --nimbus-ink    oklch(0.97 0.005 90)→ #f7f6f3
 *   --nimbus-muted  oklch(0.55 0.01 90) → #7d7b76
 *   --nimbus-accent oklch(0.88 0.2 85)  → #f5b13d
 */
const PAPER = "#0d0d0d";
const INK = "#f7f6f3";
const MUTED = "#7d7b76";
const ACCENT = "#f5b13d";
const RULE = "rgba(255, 255, 255, 0.16)";

export async function GET(request: Request) {
  try {
    const card = await ogCard(request, "nimbus", {
      bio: "Projects, experience and contact details in one place.",
      availability: "Available for collaborations",
      location: "Remote",
    });
    if (!card) return ogNotFound();
    const { name, headline, bio, availability, location, subdomain } = card;

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: PAPER,
          color: INK,
          fontFamily: "serif",
          padding: "48px 64px",
          justifyContent: "space-between",
        }}
      >
        {/* Masthead rule — Nimbus reads as a printed broadsheet, so the card
            leads with a rule and a tracked-out standfirst rather than a badge. */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            width: "100%",
            borderBottom: `2px solid ${INK}`,
            paddingBottom: "18px",
          }}
        >
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: ACCENT,
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "12px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            {location}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "34px",
            marginBottom: "34px",
          }}
        >
          <div
            style={{
              fontSize: headline.length > 50 ? "68px" : "82px",
              fontWeight: 400,
              fontStyle: "italic",
              lineHeight: 0.94,
              letterSpacing: "-0.03em",
              color: INK,
              maxWidth: "1040px",
            }}
          >
            {headline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            width: "100%",
            borderTop: `1px solid ${RULE}`,
            paddingTop: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: "700px",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: ACCENT,
                marginBottom: "10px",
              }}
            >
              {availability}
            </div>
            <div style={{ fontSize: "19px", lineHeight: 1.5, color: MUTED }}>{bio}</div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "9px 18px",
              border: `1.5px solid ${ACCENT}`,
              color: ACCENT,
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "13px",
              letterSpacing: "0.02em",
            }}
          >
            {subdomain}.veriworkly.com
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        headers: OG_CACHE_HEADERS,
      },
    );
  } catch {
    return new Response(`Error generating image`, { status: 500 });
  }
}
