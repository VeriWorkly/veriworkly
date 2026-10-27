"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";

type ShareTemplate = {
  id: string;
  channel: string;
  body: string;
};

/**
 * Copy-ready posts. These are plain marketing links, not tracked referral links — the
 * ambassador program has no per-ambassador code in the schema yet, and inventing a fake
 * one here would show attribution that nothing is actually counting. Ambassadors who want
 * tracked, paid attribution today are pointed at the affiliate program, which has real
 * click and commission tracking behind it.
 */
export function ShareToolkit({ siteUrl }: { siteUrl: string }) {
  const templates: ShareTemplate[] = [
    {
      id: "group-chat",
      channel: "Group chat",
      body: `ok genuinely stop paying for resume builders — ${siteUrl} is free, runs in your browser, and doesn't hold your PDF hostage behind a subscription`,
    },
    {
      id: "linkedin",
      channel: "LinkedIn",
      body: `Career docs shouldn't live on someone else's server.\n\nI've been using VeriWorkly to build resumes, cover letters and a portfolio site — local-first, so nothing leaves my browser until I sign in to back it up.\n\nFree to use: ${siteUrl}`,
    },
    {
      id: "story",
      channel: "Instagram / story",
      body: `resume season survival kit 🧰\nfree, no login needed to start, ATS check with a free account\n${siteUrl}`,
    },
    {
      id: "club",
      channel: "Club / society email",
      body: `Hey all — sharing a free tool ahead of recruiting season. VeriWorkly does resumes, cover letters, portfolio sites and an ATS score check, with no paywall on the basics and no account required to start: ${siteUrl}`,
    },
  ];

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (template: ShareTemplate) => {
    try {
      await navigator.clipboard.writeText(template.body);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId((current) => (current === template.id ? null : current)), 2000);
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  };

  return (
    <ul className="mt-4 space-y-3">
      {templates.map((template) => (
        <li key={template.id} className="border-border bg-background rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-muted text-[10px] font-black tracking-widest uppercase">
              {template.channel}
            </p>
            <button
              type="button"
              onClick={() => copy(template)}
              className="text-accent inline-flex shrink-0 items-center gap-1.5 text-xs font-bold"
            >
              {copiedId === template.id ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copiedId === template.id ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-sm leading-6 whitespace-pre-line">{template.body}</p>
        </li>
      ))}
    </ul>
  );
}
