import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { siteConfig } from "@/config/site";
import { isAmbassadorProgramEnabled } from "@/lib/feature-flags";
import { buildPageMetadata } from "@/utils/metadata";
import { jsonLdScriptProps } from "@/utils/json-ld";
import AmbassadorNav from "@/features/ambassador/AmbassadorNav";
import AmbassadorHero from "@/features/ambassador/AmbassadorHero";
import AmbassadorPerks from "@/features/ambassador/AmbassadorPerks";
import AmbassadorLeaderboard from "@/features/ambassador/AmbassadorLeaderboard";
import AmbassadorFAQ from "@/features/ambassador/AmbassadorFAQ";
import AmbassadorFooter from "@/features/ambassador/AmbassadorFooter";
import "./ambassador.css";

const AmbassadorPlaybook = dynamic(() => import("@/features/ambassador/AmbassadorPlaybook"));

const pageUrl = `${siteConfig.url}/ambassador`;
const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "Student Ambassador Program",
)}&description=${encodeURIComponent(
  "Represent VeriWorkly on campus. Founding cohort applications open.",
)}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/ambassador",

  title: `Student Ambassador Program | ${siteConfig.shortName}`,

  description:
    "A campus program for college students, in its founding phase. Apply to represent VeriWorkly, shape what ambassadors get, and help build privacy-first career tools for students.",

  ogTitle: "Represent VeriWorkly on Campus",
  ogDescription:
    "Applications are open for the founding cohort. Every one is read by a person, and the first ambassadors help decide how the program rewards its leaders.",

  twitterTitle: "VeriWorkly Campus Ambassadors",
  twitterDescription:
    "Founding cohort applications for the student ambassador program. Reviewed by hand.",

  image: pageOgImage,
  imageAlt: "VeriWorkly Student Ambassador Program",
});

const AmbassadorPage = () => {
  // Mirrors /affiliate. Without this the pitch rendered in full while the Apply
  // button dead-ended on the flagged-off apply page (B-08).
  const programEnabled = isAmbassadorProgramEnabled();

  const ambassadorSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "VeriWorkly Student Ambassador Program",
    url: pageUrl,
    description:
      "A founding-phase campus program. Apply to represent VeriWorkly at your college and help shape how the program rewards its ambassadors.",
  };

  return (
    <>
      {/* Uses the shared helper rather than a hand-rolled copy of the same escaping. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(ambassadorSchema)}
      />

      <div className="bg-background relative min-h-screen">
        <AmbassadorNav />

        <main>
          <AmbassadorHero programEnabled={programEnabled} />
          <AmbassadorPerks />
          <AmbassadorPlaybook />
          <AmbassadorLeaderboard />
          <AmbassadorFAQ />
        </main>

        <AmbassadorFooter />
      </div>
    </>
  );
};

export default AmbassadorPage;
