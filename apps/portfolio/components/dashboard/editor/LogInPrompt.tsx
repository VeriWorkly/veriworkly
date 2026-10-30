"use client";

import { LogIn } from "lucide-react";

import { siteConfig } from "@/config/site";
import { studioLoginUrl } from "@/lib/authenticated-fetch";

/** Inline "Log in to ..." for a guest, in place of a control that needs an account. */
export function LogInPrompt({ children }: { children: string }) {
  return (
    <a
      className="text-accent inline-flex min-h-9 items-center gap-2 text-xs font-extrabold hover:underline"
      href={`${siteConfig.links.app}/login`}
      onClick={(event) => {
        // Comes back to this page after login. Studio is another origin, so a full page load.
        event.preventDefault();
        window.location.href = studioLoginUrl();
      }}
    >
      <LogIn size={13} aria-hidden="true" /> {children}
    </a>
  );
}
