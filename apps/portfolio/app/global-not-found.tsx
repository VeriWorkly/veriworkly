import type { Metadata } from "next";
import { Outfit } from "next/font/google";

import "./globals.css";

import NotFoundPage from "./(platform)/not-found";

// The app has two root layouts (platform and published sites), so an unmatched URL has no layout
// to render a not-found page in; this page carries its own document.
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  title: "Page not found | VeriWorkly Portfolio",
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <NotFoundPage />
      </body>
    </html>
  );
}
