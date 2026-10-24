import { Check } from "lucide-react";

import { GithubIcon, LinkedInIcon } from "@veriworkly/ui";

import { PageSection, TYPE } from "@/components/marketing/PageLayout";

export const IngestionSection = () => (
  <PageSection
    id="imports"
    tone="card"
    title="Import it. Don't retype it."
    lede="Bring your repositories and your work history straight into your private Master Profile, then pull them into any resume or portfolio."
  >
    <div className="grid gap-12 lg:grid-cols-2">
      <article className="reveal min-w-0">
        <div data-ui className="bg-background rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <GithubIcon className="size-6" />
            <p className="text-base font-semibold">GitHub import</p>
          </div>

          {/*
            A generic placeholder, not a real repository. This once read
            "veriworkly/core-engine · 342 stars": a repository that does not exist, with an
            invented star count, rendered as if it were live data. A mockup should look like one.
          */}
          <ul className="mt-6 space-y-2">
            {["your-name/your-project", "your-name/another-project"].map((repo, idx) => (
              <li
                key={repo}
                className="bg-card flex items-center justify-between gap-4 rounded-2xl px-4 py-3.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold">{repo}</span>
                  <span className="text-muted block text-sm">
                    {idx === 0 ? "TypeScript" : "Python"} · description · demo link
                  </span>
                </span>
                <span className="text-success flex shrink-0 items-center gap-1.5 text-sm font-semibold">
                  <Check aria-hidden="true" className="size-4" />
                  Imported
                </span>
              </li>
            ))}
          </ul>
        </div>

        <h3 className={`mt-8 ${TYPE.title}`}>For engineers and contributors</h3>
        <p className="text-muted mt-3 max-w-lg text-base leading-7 text-pretty">
          Connect GitHub to import your most recently updated repositories with their primary
          language, description, topics and star count.
        </p>
        <p className="mt-4 max-w-lg text-base leading-7 text-pretty">
          We request no write, commit or SSH access. GitHub shows you the exact scopes on its
          consent screen.
        </p>
      </article>

      <article className="reveal min-w-0">
        <div data-ui className="bg-background rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <LinkedInIcon className="size-6" />
            <p className="text-base font-semibold">LinkedIn import</p>
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
            {[
              ["4", "roles"],
              ["2", "degrees"],
              ["18", "skills"],
            ].map(([count, label]) => (
              <div key={label} className="bg-card rounded-2xl px-2 py-5">
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="block text-3xl font-bold tracking-tight tabular-nums">
                    {count}
                  </span>
                  <span className="text-muted block text-sm">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-muted mt-4 text-sm">Sample import, structured into your profile.</p>
        </div>

        <h3 className={`mt-8 ${TYPE.title}`}>For every career path</h3>
        <p className="text-muted mt-3 max-w-lg text-base leading-7 text-pretty">
          Export your LinkedIn profile data and import it in seconds. Experience, education,
          certifications and skills become structured entries, and informal bullets become clear
          achievements.
        </p>
        {/*
          This once read "Processed client-side in your browser for total privacy", the opposite
          of what happens: the pasted text is POSTed to /profiles/import/linkedin and forwarded to
          a third-party model through parseTextToResumeSchema. The privacy policy describes the
          real behaviour, so this copy matches it.
        */}
        <p className="mt-4 max-w-lg text-base leading-7 text-pretty">
          Parsed on our servers by an AI model, then discarded. Not used for training.
        </p>
      </article>
    </div>
  </PageSection>
);

export default IngestionSection;
