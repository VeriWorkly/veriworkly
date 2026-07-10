import Link from "next/link";

import { Card } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";

import { featureItems } from "../data/featureItems";

const FeaturesSection = () => {
  return (
    <section className="space-y-6" aria-labelledby="features-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Experience</p>

          <h2
            id="features-heading"
            className="text-foreground text-3xl font-semibold tracking-tight"
          >
            Focused, minimal, powerful
          </h2>

          <p className="sr-only">
            ATS-friendly resume builder features for creating professional resumes quickly.
          </p>
        </div>

        <Link
          href={siteConfig.links.app}
          aria-label="Start building your resume"
          className="text-accent text-sm font-medium"
        >
          Start now
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {featureItems.map((item, index) => (
          <Card className="space-y-3 p-6" key={item.title}>
            <p className="text-accent text-xs font-semibold tracking-[0.22em] uppercase">
              {String(index + 1).padStart(2, "0")}
            </p>

            <h3 className="text-foreground text-xl font-semibold tracking-tight">{item.title}</h3>

            <p className="text-muted text-sm leading-6">{item.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
