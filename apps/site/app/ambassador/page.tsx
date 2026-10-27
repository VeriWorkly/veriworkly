import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { siteConfig } from "@/config/site";
import { isAmbassadorProgramEnabled } from "@/lib/feature-flags";
import { buildPageMetadata } from "@/utils/metadata";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { webSiteRef } from "@/utils/schema";
import AmbassadorNav from "@/features/ambassador/AmbassadorNav";
import AmbassadorHero from "@/features/ambassador/AmbassadorHero";
import AmbassadorPerks from "@/features/ambassador/AmbassadorPerks";
import AmbassadorLeaderboard from "@/features/ambassador/AmbassadorLeaderboard";
import AmbassadorFAQ from "@/features/ambassador/AmbassadorFAQ";
import AmbassadorFooter from "@/features/ambassador/AmbassadorFooter";
import "./ambassador.css";
import { MotionIsland } from "@/providers/motion-island";
import { ogPageImage } from "@/features/og/cards";

const AmbassadorPlaybook = dynamic(() => import("@/features/ambassador/AmbassadorPlaybook"));

const pageUrl = `${siteConfig.url}/ambassador`;
const pageOgImage = ogPageImage("ambassador");

// Flags come from the runtime env (the build does not pass them), so re-read them every 5 minutes.
export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  path: "/ambassador",

  title: `Student Ambassador Program | ${siteConfig.shortName}`,

  description:
    "A campus program for college students in its founding phase. Apply to represent VeriWorkly, shape what ambassadors get, and build career tools for students.",

  ogTitle: "Represent VeriWorkly on Campus",
  ogDescription:
    "Applications are open for the founding cohort. Every one is read by a person, and the first ambassadors help decide how the program rewards its leaders.",

  twitterTitle: "VeriWorkly Campus Ambassadors",
  twitterDescription:
    "Founding cohort applications for the student ambassador program. Reviewed by hand.",

  image: pageOgImage,
  imageAlt: "VeriWorkly Student Ambassador Program",
});

const AmbassadorPage = async () => {
  // Without this the pitch rendered while Apply dead-ended on the flagged-off apply page.
  const programEnabled = isAmbassadorProgramEnabled();

  const ambassadorSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "VeriWorkly Student Ambassador Program",
    url: pageUrl,
    isPartOf: webSiteRef,
    description:
      "A founding-phase campus program. Apply to represent VeriWorkly at your college and help shape how the program rewards its ambassadors.",
  };

  return (
    <MotionIsland>
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
    </MotionIsland>
  );
};

export default AmbassadorPage;
