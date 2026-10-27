import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageSection, TYPE } from "@/components/marketing/PageLayout";

const PROGRAMS = [
  {
    title: "Affiliate program",
    description:
      "Share VeriWorkly with your network and earn recurring commissions on every upgrade, with clicks, referrals and payouts in one dashboard.",
    href: "/affiliate",
    cta: "Become an affiliate",
  },
  {
    title: "Student ambassadors",
    description:
      "Help students on your campus build strong resumes and portfolios. The first intake is open; rewards are being designed around free access to paid features and will be published before anyone is asked to earn them.",
    href: "/ambassador",
    cta: "Join the student program",
  },
];

/** Each program page shows its own "opens soon" state, so /about needs no flag and stays static. */
const AboutPrograms = () => {
  const open = PROGRAMS;

  return (
    <PageSection
      tone="card"
      title="Help other people get hired."
      lede="Two ways to bring VeriWorkly to the people around you: earn commission as an affiliate, or represent us on campus as an ambassador."
    >
      <ul className={`grid gap-6 ${open.length > 1 ? "md:grid-cols-2" : ""}`}>
        {open.map((program) => (
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
