import { ChevronRight, PencilLine, LayoutTemplate, Globe2 } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Fill one focused form",
    copy: "Add work, links, services, experience, testimonials, SEO, and publishing details from one calm workspace.",
    icon: PencilLine,
  },

  {
    number: "02",
    title: "Preview real templates",
    copy: "Check the live template before committing. Your content stays intact while the presentation changes.",
    icon: LayoutTemplate,
  },

  {
    number: "03",
    title: "Publish with confidence",
    copy: "Launch on a VeriWorkly subdomain, update metadata, and keep refining whenever your work evolves.",
    icon: Globe2,
  },
];

const HowItWorksSection = () => {
  return (
    <section
      className="mx-auto w-[min(1360px,calc(100%-48px))] py-32 max-sm:w-[min(calc(100%-30px),1360px)] md:py-48"
      id="how-it-works"
    >
      <div className="mb-18 grid items-end gap-8 lg:grid-cols-[1fr_1.2fr_0.8fr]" data-reveal>
        <div>
          <p className="mb-5 text-[0.72rem] font-bold tracking-[0.16em] uppercase">
            The shortest path from work to website
          </p>

          <h2 className="text-[clamp(3.4rem,7vw,7rem)] leading-[0.9] tracking-tighter wrap-normal">
            <span className="sr-only">How the portfolio builder works: </span>
            Build it once. Keep it alive.
          </h2>
        </div>

        <p className="text-ink-2/60 max-w-sm text-sm leading-7">
          Your content is the source of truth. Templates are different lenses for the same proof.
        </p>
      </div>

      <div className="border-ink-2 grid border-t-2 lg:grid-cols-3">
        {steps.map(({ number, title, copy, icon: Icon }) => (
          <article
            data-reveal
            key={number}
            className="group hover:bg-accent border-ink-2/20 flex min-h-102.5 flex-col justify-between p-6 transition-colors duration-500 hover:text-white max-lg:min-h-77.5 max-lg:border-b lg:border-r lg:last:border-r-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{number}</span>
              <Icon size={22} aria-hidden="true" />
            </div>

            <div>
              <h3 className="max-w-xs text-3xl leading-none font-medium tracking-[-0.055em]">
                {title}
              </h3>

              <p className="text-ink-2/58 mt-4 max-w-xs text-sm leading-7 group-hover:text-white/70">
                {copy}
              </p>
            </div>

            <ChevronRight size={20} aria-hidden="true" />
          </article>
        ))}
      </div>
    </section>
  );
};

export default HowItWorksSection;
