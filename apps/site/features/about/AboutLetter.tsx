import Image from "next/image";

import { cn } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { FRAME, TYPE } from "@/components/marketing/PageLayout";

/**
 * The founder's note, set like a letter: the heading and signature hold the left column, the
 * text reads at a comfortable size on the right. On a phone it runs heading, letter, signature.
 */
const AboutLetter = () => (
  <section className="bg-accent text-accent-foreground border-border border-b py-20 lg:py-28">
    <figure
      className={cn(
        FRAME,
        "grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:grid-rows-[auto_1fr] lg:gap-x-14",
      )}
    >
      <h2 className={cn("reveal text-balance", TYPE.section)}>Why this exists.</h2>

      <blockquote className="reveal max-w-2xl space-y-5 text-lg leading-8 text-pretty lg:row-span-2 lg:text-xl lg:leading-9">
        <p>
          A few years ago I spent a Sunday afternoon tailoring a resume for a job I really wanted.
          When I clicked &ldquo;Download PDF&rdquo;, the site asked for a couple of dollars for a
          trial that renewed into a subscription costing more than twenty a month.
        </p>
        <p>
          I built {siteConfig.shortName} so nobody has to deal with that again. You shouldn&apos;t
          need a subscription to download a document you wrote yourself.
        </p>
        <p>
          Creating and exporting documents is free, in every format. Paid plans cover premium
          portfolio templates, removing the portfolio badge and heavy AI use, which is what pays the
          servers.
        </p>
      </blockquote>

      <figcaption className="flex items-center gap-4 lg:self-end">
        <Image
          src={siteConfig.creatorLinks.avatar}
          alt={siteConfig.creator}
          width={48}
          height={48}
          className="size-12 rounded-full"
        />
        <span>
          <span className="block text-base font-semibold">{siteConfig.creator}</span>
          <span className="block text-sm opacity-80">
            Founder and sole maintainer, {siteConfig.shortName} · India · building it since{" "}
            <time dateTime="2026-03">March 2026</time>
          </span>
        </span>
      </figcaption>
    </figure>
  </section>
);

export default AboutLetter;
