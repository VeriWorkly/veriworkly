import Link from "next/link";
import { ArrowRight, GraduationCap, Users } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Reveal } from "@/components/marketing/Reveal";

const AboutStudentProgram = () => {
  return (
    <>
      <section className="mx-auto w-full max-w-3xl border-t border-zinc-200/40 px-6 py-24 md:px-8 md:py-32 dark:border-zinc-800/20">
        <Reveal>
          <p className="font-mono text-xs tracking-widest text-blue-500 uppercase">
            A note from the founder
          </p>
          <p className="mt-6 text-2xl leading-normal font-medium text-balance text-zinc-800 md:text-3xl dark:text-zinc-100">
            I built VeriWorkly because I was tired of watching people pay recurring fees to download
            a PDF of their own résumé. Career tools should respect the fact that this is your data,
            your history, and your decision how it&apos;s used — not a growth lever for someone
            else&apos;s subscription metrics.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
              GR
            </span>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Gautam Raj</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Founder, {siteConfig.shortName}
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto w-full max-w-350 border-t border-zinc-200/40 px-6 py-24 md:px-8 md:py-32 dark:border-zinc-800/20">
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal className="group relative flex flex-col justify-between overflow-hidden rounded-4xl border border-blue-500/15 bg-blue-500/4 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30 md:p-10 dark:border-blue-500/10 dark:bg-blue-500/3">
            <div className="space-y-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Users className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                Affiliate Program
              </h3>
              <p className="max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Promote user sovereignty in career documents and earn recurring commissions of 2%,
                3%, or 5%. Track conversions, clicks, and payouts inside your partner dashboard.
              </p>
            </div>
            <Link
              href="/affiliate"
              className="group/link mt-8 inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Become an Affiliate
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover/link:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </Reveal>

          <Reveal
            delay={0.1}
            className="group relative flex flex-col justify-between overflow-hidden rounded-4xl border border-emerald-500/15 bg-emerald-500/4 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 md:p-10 dark:border-emerald-500/10 dark:bg-emerald-500/3"
          >
            <div className="space-y-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <GraduationCap className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                Student Ambassador
              </h3>
              <p className="max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Represent VeriWorkly on your campus, help peers build their career identity, and
                earn free Portfolio Pro licenses, point boosters, and hackathon workshop
                sponsorships.
              </p>
            </div>
            <Link
              href="/ambassador"
              className="group/link mt-8 inline-flex w-fit items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Join Student Program
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover/link:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
};

export default AboutStudentProgram;
