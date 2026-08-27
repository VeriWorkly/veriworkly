import { Mail, MessageSquare, ShieldAlert, ArrowRight } from "lucide-react";

import { siteConfig } from "@/config/site";

import { Reveal } from "@/components/marketing/Reveal";

const contactChannels = [
  {
    label: "Direct Email Support",
    href: `mailto:${siteConfig.email}`,
    detail: "Billing questions, AI credits, document help",
    badge: "Direct Founder Inbox",
    icon: Mail,
  },
  {
    label: "GitHub Community",
    href: `${siteConfig.links.github}/discussions`,
    detail: "Feature requests, ideas, and open-source discussion",
    badge: "Public Forum",
    icon: MessageSquare,
  },
  {
    label: "Security & Bug Reports",
    href: `${siteConfig.links.github}/blob/main/SECURITY.md`,
    detail: "Private vulnerability disclosure before public release",
    badge: "Security Policy",
    icon: ShieldAlert,
  },
];

export const ContactChannelsSection = () => {
  return (
    <Reveal className="divide-border/60 border-border/60 bg-card/40 grid divide-y overflow-hidden rounded-3xl border shadow-md backdrop-blur-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {contactChannels.map((option) => {
        const Icon = option.icon;
        return (
          <a
            key={option.label}
            href={option.href}
            target={option.href.startsWith("http") ? "_blank" : undefined}
            rel={option.href.startsWith("http") ? "noreferrer" : undefined}
            className="group hover:bg-accent/4 flex flex-col justify-between p-6 transition-all duration-300 ease-out md:p-7"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="bg-accent/10 text-accent ring-accent/20 flex size-10 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105">
                  <Icon className="size-5" aria-hidden="true" />
                </span>

                <span className="border-border/60 bg-muted/20 text-muted rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-medium tracking-wider uppercase">
                  {option.badge}
                </span>
              </div>

              <div>
                <p className="text-foreground group-hover:text-accent text-base font-bold tracking-tight transition-colors">
                  {option.label}
                </p>

                <p className="text-muted mt-1 text-xs leading-relaxed">{option.detail}</p>
              </div>
            </div>

            <div className="text-accent border-border/30 mt-5 flex items-center gap-1.5 border-t pt-2 text-xs font-semibold">
              <span>Connect now</span>

              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </div>
          </a>
        );
      })}
    </Reveal>
  );
};

export default ContactChannelsSection;
