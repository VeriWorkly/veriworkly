import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const name = searchParams.get("name") ?? "Gautam Raj";
    const headline =
      searchParams.get("headline") ?? "Builder shaping VeriWorkly into useful public tools.";
    const bio =
      searchParams.get("bio") ??
      "I build VeriWorkly across resumes, portfolios, docs, publishing, and product workflows.";
    const availability = searchParams.get("availability") ?? "Available for collaborations";
    const location = searchParams.get("location") ?? "India";
    const subdomain = searchParams.get("subdomain") ?? "gautam";

    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#e2eae0",
          color: "#182b25",
          fontFamily: "sans-serif",
          padding: "50px 70px",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: "radial-gradient(rgba(24, 43, 37, 0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            opacity: 0.8,
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            borderBottom: "1.5px solid rgba(24, 43, 37, 0.12)",
            paddingBottom: "24px",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                display: "flex",
                width: "40px",
                height: "40px",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                border: "1.5px solid #182b25",
                fontWeight: 800,
                fontSize: "14px",
                fontFamily: "monospace",
                backgroundColor: "rgba(24, 43, 37, 0.03)",
              }}
            >
              {initials}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "-0.02em" }}>
                {name}
              </span>
              <span style={{ fontSize: "11px", color: "#61726a", marginTop: "1px" }}>
                {location}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "11px",
              fontWeight: 800,
              color: "#139a75",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#139a75",
              }}
            />
            {availability}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "40px",
            marginBottom: "30px",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: headline.length > 50 ? "54px" : "64px",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.05em",
              color: "#182b25",
              maxWidth: "1060px",
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
            borderTop: "1.5px solid rgba(24, 43, 37, 0.12)",
            paddingTop: "24px",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: "20px",
              lineHeight: 1.55,
              color: "#4d5f56",
              maxWidth: "720px",
            }}
          >
            {bio}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: "100px",
              border: "1.5px solid #182b25",
              backgroundColor: "#182b25",
              color: "#e2eae0",
              fontWeight: 800,
              fontSize: "14px",
              letterSpacing: "-0.01em",
            }}
          >
            {subdomain}.veriworkly.com
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch {
    return new Response(`Error generating image`, { status: 500 });
  }
}
