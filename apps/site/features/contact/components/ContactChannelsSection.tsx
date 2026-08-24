import React from "react";
import { Mail, MessageSquare, ShieldAlert, ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Reveal } from "@/components/marketing/Reveal";

const contactChannels = [
  {
    label: "Email Support",
    href: `mailto:${siteConfig.email}`,
    detail: "Billing, account access, deletion requests",
    icon: Mail,
  },
  {
    label: "Security Report",
    href: `${siteConfig.links.github}/blob/main/SECURITY.md`,
    detail: "Private disclosure before publishing",
    icon: ShieldAlert,
  },
  {
    label: "GitHub Community",
    href: `${siteConfig.links.github}/discussions`,
    detail: "Ask questions, share layouts, discuss ideas",
    icon: MessageSquare,
  },
];

export const ContactChannelsSection = () => {
  return (
    <Reveal className="grid divide-y divide-zinc-200 overflow-hidden rounded-3xl border border-zinc-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-zinc-800 dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
      {contactChannels.map((option) => {
        const Icon = option.icon;
        return (
          <a
            key={option.label}
            href={option.href}
            target={option.href.startsWith("http") ? "_blank" : undefined}
            rel={option.href.startsWith("http") ? "noreferrer" : undefined}
            className="group flex items-center gap-4 p-5 transition-colors hover:bg-blue-500/5 md:p-6"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              <Icon className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{option.label}</p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{option.detail}</p>
            </div>
            <ArrowRight
              className="ml-auto h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-500 dark:text-zinc-700"
              aria-hidden="true"
            />
          </a>
        );
      })}
    </Reveal>
  );
};

export default ContactChannelsSection;
