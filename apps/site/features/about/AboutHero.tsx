import { Check, Lock } from "lucide-react";

import { siteConfig } from "@/config/site";

import { PageHero } from "@/components/marketing/PageLayout";
import { LandingButton } from "@/components/marketing/LandingButton";

const EXPORT_FORMATS = [
  { name: "PDF", note: "ATS-ready, selectable text" },
  { name: "Word (.docx)", note: "Editable in Word and Docs" },
  { name: "Markdown", note: "For READMEs and notes" },
  { name: "HTML", note: "Keeps your colours" },
  { name: "Plain text", note: "For paste-in job forms" },
  { name: "JSON", note: "Your data, portable" },
];

/**
 * The page's picture is the moment the product was built to remove: the export dialog.
 * Two real-looking dialogs side by side, the category's and ours, so the story in the
 * headline is shown rather than told.
 */
const ExportContrast = () => (
  <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
    <figure className="flex flex-col">
      <div
        data-ui
        className="border-border bg-card flex flex-1 flex-col rounded-3xl border p-6 sm:p-8"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Download your resume</p>
          <Lock aria-hidden="true" className="text-muted size-4" />
        </div>

        <p className="mt-8 text-2xl font-bold tracking-tight">Unlock your PDF</p>
        <p className="text-muted mt-2 text-base">
          Your resume is ready. Choose a plan to export it.
        </p>

        <div className="bg-background mt-8 rounded-2xl p-5">
          <p className="text-3xl font-bold tracking-tighter tabular-nums">
            $25.95
            <span className="text-muted ml-2 text-base font-medium tracking-normal">
              every 4 weeks
            </span>
          </p>
          <p className="text-muted mt-2 text-sm">Renews automatically until you cancel.</p>
        </div>

        <span className="bg-foreground/10 text-muted mt-auto flex h-12 items-center justify-center rounded-full text-sm font-semibold sm:mt-8">
          Start subscription to download
        </span>
      </div>
      <figcaption className="text-muted mt-4 text-sm">
        A typical resume builder: the download is the paywall.
      </figcaption>
    </figure>

    <figure className="flex flex-col">
      <div
        data-ui
        className="bg-foreground text-background flex flex-1 flex-col rounded-3xl p-6 sm:p-8"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Export resume</p>
          <span className="rounded-full bg-current/10 px-3 py-1 text-sm font-semibold">
            No account needed
          </span>
        </div>

        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {EXPORT_FORMATS.map((format) => (
            <li
              key={format.name}
              className="flex items-center justify-between gap-4 rounded-2xl bg-current/[0.06] px-4 py-3.5"
            >
              <span>
                <span className="block text-base font-semibold">{format.name}</span>
                <span className="block text-sm opacity-65">{format.note}</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Check aria-hidden="true" className="size-4" />
                Free
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-auto flex items-center justify-between gap-4 pt-6 text-sm opacity-70">
          <span>Generated in your browser</span>
          <span>No watermark</span>
        </p>
      </div>
      <figcaption className="text-muted mt-4 text-sm">
        VeriWorkly: every format, free, before you ever make an account.
      </figcaption>
    </figure>
  </div>
);

const AboutHero = () => (
  <PageHero
    title="Your resume"
    highlight="is yours."
    lede={
      <>
        {siteConfig.shortName} is a free, open-source resume, cover letter and portfolio builder,
        made by {siteConfig.creator} in India. It started after one too many resume builders locked
        the download button behind a monthly charge. Everything is free to build and export, and
        your files stay on your machine unless you choose to sync.
      </>
    }
    aside={
      <div className="flex flex-wrap gap-3">
        <LandingButton showArrow size="lg" variant="solid" href={siteConfig.links.app}>
          Open Studio
        </LandingButton>
        <LandingButton size="lg" variant="outline" href="/contact">
          Message the team
        </LandingButton>
      </div>
    }
  >
    <ExportContrast />
  </PageHero>
);

export default AboutHero;
