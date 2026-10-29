import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageSection, TYPE } from "@/components/marketing/PageLayout";

const PROGRAMS = [
  {
    title: "Affiliate program",
    description:
      "Share VeriWorkly with your network and earn recurring commissions on every upgrade, with clicks, referrals and payouts in one dashboard.",
    href: "/affiliate",
    cta: "See the affiliate program",
  },
  {
    title: "Student ambassadors",
    description:
      "Help students on your campus build strong resumes and portfolios. The first intake is a founding cohort; rewards are being designed around free access to paid features and will be published before anyone is asked to earn them.",
    href: "/ambassador",
    cta: "See the student program",
  },
];

/** The copy holds whether or not sign-ups are open: each program page shows its own state, so /about stays static. */
const AboutPrograms = () => {
  return (
    <PageSection
      tone="card"
      title="Help other people get hired."
      lede="Two ways to bring VeriWorkly to the people around you: earn commission as an affiliate, or represent us on campus as an ambassador. Each page says when sign-ups open."
    >
      <ul className="grid gap-6 md:grid-cols-2">
        {PROGRAMS.map((program) => (
          <li key={program.href} className="reveal">
            <Link
              href={program.href}
              className="group bg-background focus-visible:ring-accent/40 flex h-full flex-col rounded-3xl p-8 transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99] lg:p-10"
            >
              <h3 className={TYPE.title}>{program.title}</h3>
              <p className="text-muted mt-3 max-w-md text-base leading-7 text-pretty">
                {program.description}
              </p>
              <span className="text-accent mt-10 inline-flex items-center gap-2 text-base font-semibold">
                {program.cta}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PageSection>
  );
};

export default AboutPrograms;
