import Link from "next/link";

import { Card } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";

const resources = [
  {
    title: "Portfolio",
    href: siteConfig.links.portfolio,
    description:
      "Create your personal showcase website from a template and publish it instantly on our subdomain.",
  },

  {
    title: "About",
    href: "/about",
    description:
      "Learn why VeriWorkly exists and how this career documents and portfolio publisher is designed around privacy and control.",
  },

  {
    title: "Contact",
    href: "/contact",
    description:
      "Find the fastest way to reach the project for support, feedback, or collaboration.",
  },

  {
    title: "Privacy",
    href: "/privacy",
    description:
      "See how your career documents data, sharing, and optional sync features are handled securely.",
  },

  {
    title: "Security",
    href: "/security",
    description: "Review the practical security model, limits, and responsible disclosure path.",
  },

  {
    title: "Blog",
    href: "https://blog.veriworkly.com",
    description:
      "Expert career tips, ATS tailoring strategies, and portfolio advice to help you land your next job.",
  },

  {
    title: "Documentation",
    href: "https://docs.veriworkly.com",
    description:
      "Comprehensive guides and API references for using and integrating with VeriWorkly.",
  },

  {
    title: "Style Guide",
    href: "/style-guide",
    description:
      "See the official colors, typography, spacing, and reusable UI standards used across VeriWorkly.",
  },

  {
    title: "Terms",
    href: "/terms",
    description: "Read the usage rules and ownership expectations for the service.",
  },

  {
    title: "FAQ",
    href: "/faq",
    description:
      "Get answers about using the document builder, templates, exports, portfolio subdomains, and account-free usage.",
  },
];

const ResourcesSection = () => {
  return (
    <section className="space-y-6" aria-labelledby="resources-heading">
      <div className="space-y-2">
        <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Explore More</p>

        <h2
          id="resources-heading"
          className="text-foreground text-3xl font-semibold tracking-tight"
        >
          Learn more about the platform before you trust it
        </h2>

        <p className="text-muted -mt-1 text-base leading-7">
          These pages explain what VeriWorkly does, how data is handled, and where to get help when
          you need it.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {resources.map((resource) => (
          <Card key={resource.href} className="space-y-3 p-6">
            <Link
              href={resource.href}
              className="text-foreground hover:text-accent text-lg font-semibold transition-colors"
            >
              {resource.title}
            </Link>

            <p className="text-muted text-sm leading-6">{resource.description}</p>
          </Card>
        ))}
      </div>

      <p className="sr-only">
        Learn about the document builder, portfolio publisher, privacy policy, security, templates,
        and how to create resumes online.
      </p>
    </section>
  );
};

export default ResourcesSection;
