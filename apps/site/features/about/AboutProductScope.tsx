import { Rocket } from "lucide-react";
import MasterProfileFlow from "./MasterProfileFlow";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";

const productScope = [
  {
    title: "Document Studio",
    description:
      "Create ATS-friendly resumes and matched cover letters tailored to specific targets.",
  },
  {
    title: "Personal Portfolios",
    description:
      "Deploy responsive web portfolios hosted on subdomains with visitor view analytics.",
  },
  {
    title: "Link-in-Bio Cards",
    description:
      "Share your links and list digital services with very competitive transaction rates.",
  },
  {
    title: "Utility Docs",
    description:
      "Generate invoices and project agreements locally to manage your freelance operations.",
  },
];

const AboutProductScope = () => {
  return (
    <section className="mx-auto w-full max-w-350 border-t border-zinc-200/40 px-6 py-24 md:px-8 md:py-32 dark:border-zinc-800/20">
      <div className="mb-12 max-w-2xl">
        <SectionEyebrow icon={Rocket} label="One profile, four outputs" />
        <h2 className="mt-6 font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl dark:text-white">
          Four documents, one source of truth
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
          Your career documents are connected assets. Every one of them pulls a snapshot from your
          Master Profile, then goes its own way.
        </p>
      </div>

      <Reveal>
        <MasterProfileFlow />
      </Reveal>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {productScope.map((item, idx) => (
          <Reveal
            key={item.title}
            delay={idx * 0.06}
            className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800"
          >
            <h3 className="font-semibold text-zinc-900 dark:text-white">{item.title}</h3>
            <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">{item.description}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default AboutProductScope;
