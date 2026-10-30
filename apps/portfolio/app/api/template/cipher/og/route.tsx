import { ImageResponse } from "next/og";
import { OG_CACHE_HEADERS, clampOgText } from "@/lib/og-text";

export const runtime = "nodejs";

/**
 * Social card for Cipher portfolios.
 *
 * Same gap as the Nimbus route: `app/(published)/portfolios/[username]/[[...slug]]/page.tsx`
 * builds this URL from the portfolio's `templateId` unconditionally, but only
 * `signal` and `atelier` had routes — so a shared Cipher portfolio resolved its
 * `og:image` to a 404 and rendered with no preview card.
 *
 * Palette mirrors `template-library/cipher/style.css` (Satori can't parse the
 * `oklch()` tokens used there, so these are the hex equivalents):
 *   --cipher-bg     oklch(0.08 0.01 150) → #070d09
 *   --cipher-text   oklch(0.85 0.19 150) → #4ee88a  (CRT phosphor green)
 *   --cipher-dim    oklch(0.5 0.1 150)   → #3f7a56
 *   --cipher-accent oklch(0.88 0.18 95)  → #f0c64a
 */
const BG = "#070d09";
const BG_RAISED = "#0e1711";
const TEXT = "#4ee88a";
const DIM = "#3f7a56";
const ACCENT = "#f0c64a";
const BORDER = "rgba(78, 232, 138, 0.22)";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const name = clampOgText(searchParams.get("name") ?? "Your Name", 60);
    const headline = clampOgText(
      searchParams.get("headline") ?? "Developer and designer building useful products.",
      100,
    );
    const bio = clampOgText(
      searchParams.get("bio") ?? "Projects, experience and contact details in one place.",
      180,
    );
    const availability = clampOgText(
      searchParams.get("availability") ?? "Available for collaborations",
      60,
    );
    const location = clampOgText(searchParams.get("location") ?? "Remote", 60);
    const subdomain = clampOgText(searchParams.get("subdomain") ?? "yourname", 63);

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          backgroundColor: BG,
          fontFamily: "monospace",
          padding: "40px",
        }}
      >
        {/* The card is the terminal window itself — traffic lights, a title
            bar, and a prompt — because that framing *is* Cipher's identity. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            border: `1px solid ${BORDER}`,
            borderRadius: "14px",
            overflow: "hidden",
            backgroundColor: BG,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: "46px",
              padding: "0 18px",
              backgroundColor: BG_RAISED,
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ff5f57" }}
              />
              <div
                style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#febc2e" }}
              />
              <div
                style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#28c840" }}
              />
            </div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: DIM,
              }}
            >
              {name} — {location}
            </span>
            <span style={{ fontSize: "12px", color: ACCENT, letterSpacing: "0.06em" }}>
              {subdomain}.veriworkly.com
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: "34px 40px",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", fontSize: "15px", color: DIM, marginBottom: "18px" }}>
              <span style={{ color: ACCENT, marginRight: "10px" }}>$</span>
              whoami --headline
            </div>

            <div
              style={{
                fontSize: headline.length > 50 ? "46px" : "56px",
                fontWeight: 700,
                lineHeight: 1.14,
                letterSpacing: "-0.02em",
                color: TEXT,
                maxWidth: "1000px",
                marginBottom: "26px",
              }}
            >
              {headline}
            </div>

            <div
              style={{
                fontSize: "17px",
                lineHeight: 1.6,
                color: DIM,
                maxWidth: "880px",
                marginBottom: "26px",
              }}
            >
              {bio}
            </div>

            <div style={{ display: "flex", alignItems: "center", fontSize: "14px", color: TEXT }}>
              <span style={{ color: ACCENT, marginRight: "10px" }}>$</span>
              status
              <span style={{ color: DIM, margin: "0 10px" }}>→</span>
              <span style={{ color: ACCENT }}>{availability}</span>
              <span
                style={{
                  display: "flex",
                  width: "10px",
                  height: "20px",
                  backgroundColor: TEXT,
                  marginLeft: "10px",
                }}
              />
            </div>
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
