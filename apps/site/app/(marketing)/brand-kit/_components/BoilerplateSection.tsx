import { FileText } from "lucide-react";

import { Card } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";

import BrandSectionHeader from "./BrandSectionHeader";
import CopyBlock from "./CopyBlock";

const BoilerplateSection = () => {
  const short = siteConfig.tagline;
  const medium =
    "VeriWorkly is a free, open-core, privacy-first AI career workspace - a resume, cover letter, and portfolio builder that requires no login to start and keeps data local-first with optional cloud sync.";
  const long = siteConfig.description;

  return (
    <section id="boilerplate" className="scroll-mt-24 space-y-8">
      <BrandSectionHeader
        icon={FileText}
        title="Boilerplate"
        description="Ready-to-use descriptions for press mentions, integration listings, or app directories."
      />

      <Card className="grid gap-4 p-6 sm:p-8">
        <CopyBlock label="One-liner" text={short} />
        <CopyBlock label="Short (2 sentences)" text={medium} />
        <CopyBlock label="Long (press/about)" text={long} />
      </Card>
    </section>
  );
};

export default BoilerplateSection;
