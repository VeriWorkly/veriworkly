const isDev = process.env.NODE_ENV === "development";

export const portfolioSiteConfig = {
  name: "VeriWorkly Portfolio",
  url:
    process.env.SITE_URL ||
    (isDev ? "http://portfolio.localhost:3004" : "https://portfolio.veriworkly.com"),
  description:
    "Build and publish a professional portfolio website on your own VeriWorkly subdomain.",
  keywords: [
    "portfolio builder",
    "professional portfolio website",
    "developer portfolio",
    "designer portfolio",
    "online portfolio builder",
  ],
} as const;

export function portfolioPublicUrl(subdomain: string) {
  return isDev ? `http://${subdomain}.localhost:3004` : `https://${subdomain}.veriworkly.com`;
}
