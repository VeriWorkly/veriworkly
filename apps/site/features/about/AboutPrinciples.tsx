import { Gem, Rocket, Shield } from "lucide-react";
import { principles } from "./principlesData";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";

const principleIcons = [Shield, Gem, Rocket];

const AboutPrinciples = () => {
  return (
    <>
      <section className="mx-auto w-full max-w-350 px-6 py-24 md:px-8 md:py-32">
        <div className="grid gap-px overflow-hidden rounded-4xl border border-zinc-200 bg-zinc-200 lg:grid-cols-[0.85fr_1.15fr] dark:border-zinc-800 dark:bg-zinc-800">
          <Reveal className="flex flex-col justify-center bg-zinc-50 p-8 md:p-10 dark:bg-[#0a0a0a]">
            <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase dark:text-zinc-600">
              The career software tax
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl dark:text-white">
              Free templates. Locked downloads.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              Most resume tools offer templates for free, guide you through writing your
              credentials, then lock your download behind a recurring subscription — or sell your
              profile to recruitment databases.
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-red-500/15 bg-red-500/5 px-4 py-3">
              <span className="text-sm text-zinc-500 line-through decoration-red-400/60 dark:text-zinc-500">
                $23.95/mo
              </span>
              <span className="text-xs font-semibold text-red-500">
                just to export your own PDF
              </span>
            </div>
          </Reveal>

          <Reveal
            delay={0.1}
            className="flex flex-col justify-center bg-white p-8 md:p-10 dark:bg-[#0c0c0c]"
          >
            <p className="text-xs font-bold tracking-widest text-blue-500 uppercase">
              The VeriWorkly alternative
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl dark:text-white">
              Your professional history belongs to you.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              Our editor compiles documents directly in your browser&apos;s memory using client-side
              engines. Your data is never held hostage, and you can export professional PDFs or
              publish static portfolios instantly.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              We separate your master career records from your document layout sandboxes, so
              tailoring one resume never risks corrupting the source of truth behind all of them.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-350 border-t border-zinc-200/40 px-6 py-24 md:px-8 md:py-32 dark:border-zinc-800/20">
        <div className="mb-14 max-w-2xl">
          <SectionEyebrow icon={Gem} label="What we believe" />
          <h2 className="mt-6 font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl dark:text-white">
            Three principles, non-negotiable
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal className="group flex flex-col justify-between rounded-4xl border border-zinc-200 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:border-blue-500/30 hover:shadow-[0_8px_40px_rgba(59,130,246,0.12)] md:p-10 dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <Shield className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              </span>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                {principles[0]?.title}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {principles[0]?.description}
              </p>
            </div>
            <span className="mt-8 font-mono text-xs tracking-wider text-zinc-400 uppercase dark:text-zinc-600">
              Principle 01
            </span>
          </Reveal>

          <div className="flex flex-col gap-6">
            {principles.slice(1).map((principle, idx) => {
              const Icon = principleIcons[idx + 1] ?? Shield;
              return (
                <Reveal
                  key={principle.title}
                  delay={0.08 + idx * 0.08}
                  className="flex items-start gap-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:border-blue-500/30 dark:border-zinc-800/80 dark:bg-[#0c0c0c]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                    <Icon className="h-4.5 w-4.5" strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                      {principle.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                      {principle.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default AboutPrinciples;
