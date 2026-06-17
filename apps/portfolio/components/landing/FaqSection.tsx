"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ArrowRight } from "lucide-react";

const landingFaqs = [
  {
    id: "diff",
    question: "How does the portfolio builder differ from the resume builder?",
    answer:
      "The resume builder is optimized for structured, print-ready documents (PDFs, ATS trackers). The portfolio builder takes your resume data and transforms it into a public, fully styled website hosted on a custom subdomain, designed for online discovery and showcase.",
  },

  {
    id: "pricing",
    question: "What plans are available and how do AI writing credits work?",
    answer:
      "We offer flexible options: 1-Day Pass ($0.69, 25 AI credits) and 7-Day Sprint ($3.99, 220 AI credits) where credits expire when the pass ends. For long-term use, the Full Bundle subscription is $11.99/mo (or $9.99/mo annual) with 1,000 monthly AI credits that reset each billing cycle. You can also purchase Portfolio Pro only ($8.99/mo) or AI Credits only ($4.99/mo) if you prefer a single service. Unused credits do not roll over.",
  },

  {
    id: "domain",
    question: "How do custom subdomains work?",
    answer:
      "With Portfolio Pro, you can choose a unique VeriWorkly subdomain (like yourname.veriworkly.com) to share your site with the world. All subdomains include automatic, secure SSL certificates.",
  },

  {
    id: "templates",
    question: "How do page templates work?",
    answer:
      "You can switch templates at any time with a single click. Your profile data, project details, testimonials, and SEO tags remain intact. Only the presentation layer morphs, letting you redesign your portfolio instantly.",
  },

  {
    id: "build-before-paying",
    question: "Can I build my portfolio before paying?",
    answer:
      "Yes. You can create a private draft, fill your content, and preview live templates before upgrading to Portfolio Pro.",
  },
];

const FaqSection = () => {
  const [openId, setOpenId] = useState<string | null>("diff");

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="mx-auto grid w-[min(1360px,calc(100%-48px))] gap-12 pb-32 max-sm:w-[min(calc(100%-30px),1360px)] md:pb-44 lg:grid-cols-[0.82fr_1.18fr]">
      <div data-reveal className="lg:sticky lg:top-30 lg:self-start">
        <p className="mb-5 text-[0.72rem] font-black tracking-[0.16em] uppercase">Got questions?</p>

        <h2 className="max-w-4xl text-[clamp(3.4rem,7vw,7rem)] leading-none tracking-tighter wrap-normal">
          <span className="sr-only">Portfolio builder FAQ: </span>
          Frequently asked. <br />
          <span className="text-accent">Clearly answered.</span>
        </h2>

        <p className="text-ink-2/60 mt-10 max-w-md text-sm leading-6">
          Everything you need to know about custom subdomains, layout template switches, image
          hosting, and exports.
        </p>

        <div className="mt-10">
          <Link
            href="/faq"
            className="border-ink-2 bg-ink-2 hover:text-ink-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 px-6 text-sm font-black text-white transition-all duration-300 hover:-translate-y-1 hover:bg-transparent active:scale-[0.97]"
          >
            Browse all FAQs <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {landingFaqs.map((faq) => {
          const isOpen = openId === faq.id;
          const contentId = `faq-content-home-${faq.id}`;
          return (
            <article
              data-reveal
              key={faq.id}
              className={`rounded-3xl border-2 bg-white/55 transition-all duration-300 ${
                isOpen
                  ? "border-accent shadow-[8px_10px_0_rgba(37,99,235,0.08)]"
                  : "border-ink-2/15 hover:border-ink-2/30 shadow-[4px_6px_0_rgba(17,17,15,0.02)]"
              }`}
            >
              <button
                onClick={() => toggle(faq.id)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 p-6 text-left transition-transform active:scale-[0.99] sm:p-7"
                type="button"
                aria-expanded={isOpen}
                aria-controls={contentId}
              >
                <h3
                  id={`faq-title-home-${faq.id}`}
                  className="text-ink-2 text-base font-black tracking-[-0.02em] sm:text-lg"
                >
                  {faq.question}
                </h3>

                <span
                  className={`border-ink-2/12 flex size-8 shrink-0 items-center justify-center rounded-full border bg-[#f1efe7]/60 transition-transform duration-300 ${
                    isOpen
                      ? "text-accent bg-accent/10 border-accent/25 rotate-180"
                      : "text-ink-2/60"
                  }`}
                >
                  <ChevronDown className="size-4" />
                </span>
              </button>

              <div
                id={contentId}
                role="region"
                aria-labelledby={`faq-title-home-${faq.id}`}
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  isOpen ? "max-h-50 opacity-100" : "pointer-events-none max-h-0 opacity-0"
                }`}
              >
                <p className="border-ink-2/5 text-ink-2/62 mt-1 border-t px-6 pt-4 pb-7 text-sm leading-relaxed sm:px-7 sm:pb-8">
                  {faq.answer}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default FaqSection;
