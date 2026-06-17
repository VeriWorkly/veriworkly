import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const name = searchParams.get("name") ?? "Gautam Raj";
    const headline =
      searchParams.get("headline") ?? "Designer & Builder crafting elegant workspaces.";
    const bio =
      searchParams.get("bio") ??
      "Focusing on visual rhythm, editorial layouts, and high-fidelity product design.";
    const location = searchParams.get("location") ?? "New York City";
    const subdomain = searchParams.get("subdomain") ?? "gautam";

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ebd5b3",
          color: "#3b2c21",
          fontFamily: "Georgia, serif",
          padding: "60px 80px",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "40px",
            top: "115px",
            display: "flex",
            width: "360px",
            height: "360px",
            borderRadius: "50%",
            border: "1.5px solid #3b2c21",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              backgroundColor: "#e7b850",
              border: "1.5px solid #3b2c21",
              top: "-18px",
              left: "45px",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "86px",
              height: "86px",
              borderRadius: "50%",
              backgroundColor: "#cd563f",
              border: "1.5px solid #3b2c21",
              right: "0px",
              bottom: "28px",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "#4776a3",
              border: "1.5px solid #3b2c21",
              left: "-28px",
              bottom: "54px",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#a07c4c",
                fontFamily: "sans-serif",
              }}
            >
              Atelier Portfolio
            </span>
            <span
              style={{
                fontSize: "24px",
                fontStyle: "italic",
                fontWeight: "bold",
                marginTop: "2px",
              }}
            >
              {name}
            </span>
          </div>

          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#cd563f",
              fontFamily: "sans-serif",
            }}
          >
            {location}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "760px",
            marginTop: "40px",
            marginBottom: "40px",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: headline.length > 50 ? "58px" : "68px",
              fontStyle: "italic",
              lineHeight: 0.98,
              letterSpacing: "-0.05em",
              color: "#3b2c21",
              marginBottom: "24px",
            }}
          >
            {headline}
          </div>

          <div
            style={{
              fontSize: "20px",
              lineHeight: 1.6,
              color: "rgba(59, 44, 33, 0.75)",
              maxWidth: "600px",
            }}
          >
            {bio}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            borderTop: "1.5px solid rgba(59, 44, 33, 0.15)",
            paddingTop: "24px",
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(59, 44, 33, 0.5)",
              fontFamily: "sans-serif",
            }}
          >
            VeriWorkly Publishing Platform
          </span>

          <span
            style={{
              fontSize: "18px",
              fontStyle: "italic",
              fontWeight: "bold",
              color: "#3b2c21",
            }}
          >
            {subdomain}.veriworkly.com
          </span>
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
