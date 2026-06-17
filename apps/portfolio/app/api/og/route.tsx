import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get("title") ?? "Create and Publish Your Portfolio";
    const description =
      searchParams.get("description") ??
      "Choose a premium template, edit details, and launch your live portfolio in minutes.";
    const theme = searchParams.get("theme") ?? "light";
    const type = searchParams.get("type") ?? "landing";
    const template = searchParams.get("template") ?? "";
    const badge = searchParams.get("badge") ?? "PORTFOLIO BUILDER";

    const isDark = theme === "dark";

    const bg = isDark ? "#0d1117" : "#f5f4ef";
    const accent = isDark ? "#60a5fa" : "#2563eb";
    const textMain = isDark ? "#f3f4f6" : "#171717";
    const textMuted = isDark ? "#94a3b8" : "#5f5c54";
    const accentSoft = isDark ? "rgba(96, 165, 250, 0.14)" : "#dbeafe";
    const dotCol = isDark ? "rgba(243, 244, 246, 0.04)" : "rgba(23, 23, 23, 0.04)";
    const borderCol = isDark ? "rgba(243, 244, 246, 0.08)" : "rgba(23, 23, 23, 0.08)";

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://veriworkly.com";
    const logoUrl = `${baseUrl}/veriworkly-logo.png`;

    const renderRightSide = () => {
      if (template === "atelier") {
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "360px",
              height: "440px",
              backgroundColor: "#ebd5b3",
              color: "#3b2c21",
              borderRadius: "16px",
              border: `1.5px solid ${borderCol}`,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
              padding: "24px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: "-20px",
                bottom: "-20px",
                display: "flex",
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                border: "1.5px solid #3b2c21",
                opacity: 0.8,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  backgroundColor: "#e7b850",
                  border: "1.5px solid #3b2c21",
                  top: "-10px",
                  left: "20px",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  backgroundColor: "#cd563f",
                  border: "1.5px solid #3b2c21",
                  right: "-10px",
                  bottom: "20px",
                }}
              />
            </div>

            <span
              style={{
                fontFamily: "serif",
                fontSize: "12px",
                fontWeight: "bold",
                color: "#a07c4c",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Atelier Style
            </span>

            <span
              style={{
                fontFamily: "serif",
                fontSize: "28px",
                fontWeight: "bold",
                fontStyle: "italic",
                lineHeight: 1.1,
                marginBottom: "16px",
              }}
            >
              Creative Canvas
            </span>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxWidth: "200px",
              }}
            >
              <div
                style={{
                  height: "6px",
                  width: "100%",
                  backgroundColor: "rgba(59, 44, 33, 0.3)",
                  borderRadius: "2px",
                }}
              />
              <div
                style={{
                  height: "6px",
                  width: "85%",
                  backgroundColor: "rgba(59, 44, 33, 0.3)",
                  borderRadius: "2px",
                }}
              />
              <div
                style={{
                  height: "6px",
                  width: "90%",
                  backgroundColor: "rgba(59, 44, 33, 0.3)",
                  borderRadius: "2px",
                }}
              />
            </div>

            <div
              style={{
                position: "absolute",
                left: "24px",
                bottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#cd563f",
                }}
              />
              <span style={{ fontSize: "11px", fontWeight: "bold", fontFamily: "serif" }}>
                Design Focused
              </span>
            </div>
          </div>
        );
      }

      if (template === "signal") {
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "360px",
              height: "440px",
              backgroundColor: "#182b25",
              color: "#e2eae0",
              borderRadius: "16px",
              border: `1.5px solid ${borderCol}`,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
              padding: "24px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: "radial-gradient(rgba(226, 234, 224, 0.08) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            />

            <span
              style={{
                fontFamily: "monospace",
                fontSize: "12px",
                fontWeight: "bold",
                color: "#139a75",
                letterSpacing: "0.15em",
                marginBottom: "8px",
                zIndex: 5,
              }}
            >
              SIGNAL_TEMPLATE
            </span>

            <span
              style={{
                fontSize: "30px",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                marginBottom: "16px",
                zIndex: 5,
              }}
            >
              Proof-first Engineering
            </span>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                zIndex: 5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    backgroundColor: "#139a75",
                    borderRadius: "50%",
                  }}
                />
                <div
                  style={{
                    height: "6px",
                    width: "120px",
                    backgroundColor: "rgba(226, 234, 224, 0.3)",
                    borderRadius: "2px",
                  }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    backgroundColor: "#139a75",
                    borderRadius: "50%",
                  }}
                />
                <div
                  style={{
                    height: "6px",
                    width: "140px",
                    backgroundColor: "rgba(226, 234, 224, 0.3)",
                    borderRadius: "2px",
                  }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    backgroundColor: "#139a75",
                    borderRadius: "50%",
                  }}
                />
                <div
                  style={{
                    height: "6px",
                    width: "90px",
                    backgroundColor: "rgba(226, 234, 224, 0.3)",
                    borderRadius: "2px",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                right: "24px",
                bottom: "24px",
                display: "flex",
                alignItems: "center",
                padding: "6px 12px",
                borderRadius: "4px",
                border: "1px solid #139a75",
                backgroundColor: "rgba(19, 154, 117, 0.1)",
                color: "#139a75",
                fontSize: "10px",
                fontWeight: "bold",
                fontFamily: "monospace",
                zIndex: 5,
              }}
            >
              SYS.ACTIVE
            </div>
          </div>
        );
      }

      if (type === "pricing") {
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "360px",
              height: "440px",
              backgroundColor: isDark ? "#121924" : "#ffffff",
              borderRadius: "16px",
              border: `2px solid ${accent}`,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
              padding: "24px",
              position: "relative",
              overflow: "hidden",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    color: accent,
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                  }}
                >
                  PORTFOLIO PRO
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "bold",
                    backgroundColor: accentSoft,
                    color: accent,
                    padding: "2px 8px",
                    borderRadius: "100px",
                  }}
                >
                  POPULAR
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "4px",
                  marginBottom: "20px",
                }}
              >
                <span
                  style={{
                    fontSize: "36px",
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    color: textMain,
                  }}
                >
                  $8.99
                </span>
                <span style={{ fontSize: "14px", color: textMuted, fontWeight: 500 }}>/ month</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  "Custom Subdomain (name.veriworkly.com)",
                  "Visitor Analytics dashboard",
                  "Hosted Media & Optimization",
                  "Switch between premium templates",
                ].map((feature, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        backgroundColor: accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: isDark ? "#0f172a" : "#ffffff",
                        fontSize: "8px",
                        fontWeight: "bold",
                      }}
                    >
                      ✓
                    </div>
                    <span style={{ fontSize: "11px", color: textMuted, fontWeight: 500 }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: accent,
                color: isDark ? "#0f172a" : "#ffffff",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "13px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxShadow: isDark
                  ? "0 4px 12px rgba(96, 165, 250, 0.2)"
                  : "0 4px 12px rgba(37, 99, 235, 0.2)",
              }}
            >
              Upgrade to Pro
            </div>
          </div>
        );
      }

      if (type === "faq") {
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "360px",
              height: "440px",
              backgroundColor: isDark ? "#121924" : "#f5f4ef",
              borderRadius: "16px",
              border: `1.5px solid ${borderCol}`,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
              padding: "20px",
              position: "relative",
              overflow: "hidden",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.1em",
                color: accent,
                fontFamily: "monospace",
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              FAQ ASSISTANCE
            </span>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: isDark ? "#1c2431" : "#ffffff",
                borderRadius: "8px",
                border: `1px solid ${borderCol}`,
                padding: "12px 14px",
                gap: "6px",
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span style={{ fontSize: "11px", fontWeight: "bold", color: textMain }}>
                  How do subdomains work?
                </span>
                <span style={{ fontSize: "11px", fontWeight: "bold", color: accent }}>−</span>
              </div>
              <span style={{ fontSize: "9px", color: textMuted, lineHeight: 1.4 }}>
                Choose a unique name.veriworkly.com URL. SSL is provisioned instantly.
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: isDark ? "#1c2431" : "#ffffff",
                borderRadius: "8px",
                border: `1px solid ${borderCol}`,
                padding: "12px 14px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: "bold", color: textMain }}>
                Can I switch templates?
              </span>
              <span style={{ fontSize: "11px", fontWeight: "bold", color: textMuted }}>+</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: isDark ? "#1c2431" : "#ffffff",
                borderRadius: "8px",
                border: `1px solid ${borderCol}`,
                padding: "12px 14px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: "bold", color: textMain }}>
                What happens to my data?
              </span>
              <span style={{ fontSize: "11px", fontWeight: "bold", color: textMuted }}>+</span>
            </div>
          </div>
        );
      }

      if (type === "templates") {
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "360px",
              height: "440px",
              backgroundColor: isDark ? "#121924" : "#f5f4ef",
              borderRadius: "16px",
              border: `1.5px solid ${borderCol}`,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
              padding: "20px",
              position: "relative",
              overflow: "hidden",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.15em",
                color: accent,
                fontFamily: "monospace",
                textTransform: "uppercase",
              }}
            >
              TEMPLATE CATALOG
            </span>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#182b25",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "10px 14px",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(226, 234, 224, 0.1)",
                  border: "1px solid #e2eae0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#e2eae0",
                }}
              >
                SG
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#e2eae0" }}>
                  Signal
                </span>
                <span style={{ fontSize: "9px", color: "rgba(226, 234, 224, 0.6)" }}>
                  Structured / technical
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#ebd5b3",
                borderRadius: "8px",
                border: "1px solid rgba(59, 44, 33, 0.12)",
                padding: "10px 14px",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(59, 44, 33, 0.05)",
                  border: "1px solid #3b2c21",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#3b2c21",
                }}
              >
                AT
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#3b2c21" }}>
                  Atelier
                </span>
                <span style={{ fontSize: "9px", color: "rgba(59, 44, 33, 0.6)" }}>
                  Expressive / editorial
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: "10px",
                color: textMuted,
                fontStyle: "italic",
                textAlign: "center",
              }}
            >
              Switch instantly. Zero data loss.
            </span>
          </div>
        );
      }

      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "360px",
              height: "440px",
              backgroundColor: isDark ? "#121413" : "#f1efe7",
              borderRadius: "16px",
              border: `1.5px solid ${borderCol}`,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
              padding: "20px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                borderBottom: `1px solid ${borderCol}`,
                paddingBottom: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: `1px solid ${textMain}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8px",
                    fontWeight: "bold",
                  }}
                >
                  P
                </div>
                <div
                  style={{
                    height: "8px",
                    width: "60px",
                    backgroundColor: textMain,
                    borderRadius: "2px",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: accent,
                  fontSize: "8px",
                  fontWeight: "bold",
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: accent,
                  }}
                />
                LIVE
              </div>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}
            >
              <div
                style={{
                  height: "16px",
                  width: "160px",
                  backgroundColor: textMain,
                  borderRadius: "3px",
                }}
              />
              <div
                style={{
                  height: "8px",
                  width: "220px",
                  backgroundColor: textMuted,
                  borderRadius: "2px",
                }}
              />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", flex: 1 }}>
              <div
                style={{
                  flex: "1 1 45%",
                  backgroundColor: isDark ? "#1c1f1d" : "#ffffff",
                  borderRadius: "8px",
                  border: `1px solid ${borderCol}`,
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    height: "45px",
                    width: "100%",
                    backgroundColor: isDark ? "#2a2f2d" : "#eae8e0",
                    borderRadius: "4px",
                  }}
                />
                <div
                  style={{
                    height: "8px",
                    width: "70px",
                    backgroundColor: textMain,
                    borderRadius: "2px",
                  }}
                />
                <div
                  style={{
                    height: "6px",
                    width: "90px",
                    backgroundColor: textMuted,
                    borderRadius: "2px",
                  }}
                />
              </div>

              <div
                style={{
                  flex: "1 1 45%",
                  backgroundColor: isDark ? "#1c1f1d" : "#ffffff",
                  borderRadius: "8px",
                  border: `1px solid ${borderCol}`,
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    height: "45px",
                    width: "100%",
                    backgroundColor: isDark ? "#2a2f2d" : "#eae8e0",
                    borderRadius: "4px",
                  }}
                />
                <div
                  style={{
                    height: "8px",
                    width: "60px",
                    backgroundColor: textMain,
                    borderRadius: "2px",
                  }}
                />
                <div
                  style={{
                    height: "6px",
                    width: "80px",
                    backgroundColor: textMuted,
                    borderRadius: "2px",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      );
    };

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          color: textMain,
          backgroundColor: bg,
          fontFamily: "sans-serif",
          position: "relative",
          padding: "60px 80px",
          alignItems: "center",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "24px",
            left: "24px",
            right: "24px",
            bottom: "24px",
            border: `2px solid ${borderCol}`,
            borderRadius: "24px",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `radial-gradient(circle, ${dotCol} 1.5px, transparent 1.5px)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "600px",
            height: "100%",
            justifyContent: "space-between",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: 28,
                height: 28,
                marginRight: 4,
                backgroundImage: `url(${logoUrl})`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
              }}
            />
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 800,
                fontSize: "16px",
                letterSpacing: "-0.02em",
              }}
            >
              VeriWorkly
            </span>

            <div
              style={{
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                backgroundColor: textMuted,
                opacity: 0.5,
              }}
            />

            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.15em",
                color: accent,
                fontFamily: "monospace",
              }}
            >
              [ {badge.toUpperCase()} ]
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              marginTop: "30px",
              marginBottom: "30px",
            }}
          >
            <div
              style={{
                fontSize: title.length > 30 ? "46px" : "54px",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.04em",
                color: textMain,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: "17px",
                lineHeight: 1.45,
                color: textMuted,
                fontWeight: 500,
              }}
            >
              {description}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: accent,
              }}
            />
            <span
              style={{
                fontSize: "14px",
                fontWeight: 800,
                letterSpacing: "0.05em",
                color: textMain,
              }}
            >
              veriworkly.com/portfolio
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            zIndex: 10,
          }}
        >
          {renderRightSide()}
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
