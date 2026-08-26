import Link from "next/link";

import { siteConfig } from "@/config/site";

import SEOContentContainer from "@/components/SEOContentContainer";

const ChangelogSEOContent = () => {
  return (
    <SEOContentContainer>
      <h2 className="text-xl font-semibold">What is the VeriWorkly changelog?</h2>

      <p className="text-muted text-sm leading-6">
        This page lists every shipped VeriWorkly release, generated directly from our public{" "}
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={siteConfig.links.github}
          className="text-accent underline underline-offset-2"
        >
          GitHub repository
        </a>
        &apos;s release history. Each entry groups what changed into Added, Improved, Fixed,
        Security, and Breaking sections, with links back to the exact pull requests that shipped the
        work - because VeriWorkly is open-core and free-to-use, you can read the code behind every
        line here.
      </p>

      <p className="text-muted text-sm leading-6">
        Looking for what&apos;s planned next instead of what already shipped? Check the{" "}
        <Link href="/roadmap" className="text-accent underline underline-offset-2">
          public roadmap
        </Link>
        .
      </p>
    </SEOContentContainer>
  );
};

export default ChangelogSEOContent;
