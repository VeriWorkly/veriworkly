import { Check } from "lucide-react";

const seoTopics = [
  {
    title: "Portfolio website builder for developers",
    copy: "Show projects, systems, technical decisions, links, and credibility in a site that reads faster than a resume.",
  },

  {
    title: "Online portfolio for designers and builders",
    copy: "Turn services, case studies, testimonials, screenshots, and experiments into a polished public profile.",
  },

  {
    title: "Professional portfolio with SEO controls",
    copy: "Update the page title, social description, public URL, and template presentation as your work evolves.",
  },
];

const proofPoints = [
  { id: "content", text: "Fill profile content once" },
  { id: "templates", text: "Switch visual templates anytime" },
  { id: "subdomain", text: "Publish on a VeriWorkly subdomain" },
  { id: "seo", text: "Control SEO title and description" },
  { id: "previews", text: "Preview real templates before choosing" },
  { id: "drafts", text: "Keep private drafts while editing" },
];

const SeoSection = () => {
  return (
    <section className="mx-auto grid w-[min(1360px,calc(100%-48px))] gap-12 py-32 max-sm:w-[min(calc(100%-30px),1360px)] md:py-44 lg:grid-cols-[0.82fr_1.18fr]">
      <div data-reveal className="lg:sticky lg:top-30 lg:self-start">
        <p className="mb-5 text-[0.72rem] font-black tracking-[0.16em] uppercase">
          Built for search and humans
        </p>

        <h2 className="max-w-4xl text-[clamp(3.4rem,7vw,7rem)] leading-none tracking-tighter wrap-normal">
          More than a pretty portfolio page.
        </h2>

        <p className="mt-10 max-w-md text-sm leading-5 text-[#11110f]/60">
          VeriWorkly Portfolio gives your work a public home with enough structure for search
          engines and enough personality for real people.
        </p>
      </div>

      <div className="grid gap-4">
        {seoTopics.map((topic, index) => (
          <article
            data-reveal
            key={topic.title}
            className="rounded-4xl border border-[#11110f]/15 bg-white/72 p-7 shadow-[10px_12px_0_rgba(37,99,235,0.08)]"
          >
            <span className="text-accent text-xs font-black" aria-hidden="true">
              0{index + 1}
            </span>

            <h3 className="mt-4 text-[clamp(2rem,4vw,4rem)] leading-[0.92] font-black tracking-[-0.07em]">
              {topic.title}
            </h3>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#11110f]/62">{topic.copy}</p>
          </article>
        ))}

        <div className="grid gap-3 sm:grid-cols-2" data-reveal>
          {proofPoints.map((point) => (
            <div
              key={point.id}
              className="flex items-center gap-3 rounded-2xl border border-[#11110f]/12 bg-[#11110f] px-4 py-4 text-sm font-black text-white"
            >
              <Check className="size-4 text-[#93c5fd]" aria-hidden="true" />
              {point.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SeoSection;
