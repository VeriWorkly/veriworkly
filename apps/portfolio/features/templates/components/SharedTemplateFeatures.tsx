import React from "react";
import { CheckCircle2 } from "lucide-react";
import { templatesShell } from "../constants";

interface SharedFeature {
  title: string;
  description: string;
}

const sharedFeaturesList: SharedFeature[] = [
  {
    title: "Unified Content Model",
    description: "Write your case studies, biography, and credentials once. Keep 100% of your career data intact when changing styles.",
  },
  {
    title: "Instant Live Previews",
    description: "Compare structural layouts with a live-rendered preview using your real personal data before switching.",
  },
  {
    title: "Responsive by Design",
    description: "Every template features fluid grids and pure semantic HTML that render flawlessly across desktop and mobile screens.",
  },
  {
    title: "SEO & Crawler Optimization",
    description: "Built-in structured schemas, clean headings, customizable meta tags, and open graph cards for search engine rankings.",
  },
  {
    title: "VeriWorkly Subdomains",
    description: "Publish your portfolio in seconds to a professional, secure SSL-certified 'yourname.veriworkly.com' address.",
  },
  {
    title: "Private Draft Workflow",
    description: "Edit your changes in a private workspace environment and sync them to your public live site only when you are ready.",
  },
];

const SharedTemplateFeatures = () => {
  return (
    <section className="bg-ink relative overflow-hidden py-24 text-white md:py-32">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.08),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(rgba(255,255,255,0.02)_0.8px,transparent_0.8px)] bg-size-[24px_24px] opacity-25" />

      <div className={`${templatesShell} relative z-10 grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16`}>
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[0.72rem] font-bold tracking-[0.16em] text-blue-400 uppercase">
            Shared Foundations
          </p>

          <h2 className="max-w-2xl text-[clamp(2.8rem,5vw,4.5rem)] leading-none font-bold tracking-tighter">
            The style shifts. <br />
            The engine stays <span className="text-blue-400">reliable.</span>
          </h2>

          <p className="text-paper/60 mt-6 max-w-md text-sm leading-6">
            All VeriWorkly portfolio templates share a unified data engine. You can customize layout styles, subdomains, and SEO metadata while preserving 100% of your career data, case studies, and bio across layout switches without coding.
          </p>
        </div>

        <div>
          <ul className="grid gap-4 sm:grid-cols-2" role="list">
            {sharedFeaturesList.map(({ title, description }) => (
              <li
                key={title}
                className="group border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04] flex flex-col justify-between rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="size-5 shrink-0 text-blue-400 transition-transform duration-300 group-hover:scale-110" />
                    <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
                  </div>
                  <p className="text-paper/70 mt-3.5 text-xs leading-5 font-normal">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default SharedTemplateFeatures;
