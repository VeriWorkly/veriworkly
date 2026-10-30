"use client";

import { useState } from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import {
  checkSubdomain,
  isAllowedSubdomain,
  subdomainCheckMessage,
  suggestSubdomain,
  type SubdomainCheck,
} from "@/lib/subdomain";

const input =
  "w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft text-ink rounded-r-none";

export interface SubdomainFieldProps {
  slug: string;
  updateSlug: (slug: string) => void;
  signedIn: boolean;
  /** A save or publish the server refused over the subdomain, shown here instead of only in a toast. */
  serverIssue?: string;
}

/** The subdomain input, open on every plan (P-023), checked with the server when it loses focus. */
export function SubdomainField({ slug, updateSlug, signedIn, serverIssue }: SubdomainFieldProps) {
  // What the user is typing. The store keeps the normalized slug, which drops a trailing
  // hyphen, so showing it while typing would eat the "-" in "jane-doe".
  const [text, setText] = useState<string | null>(null);
  const [check, setCheck] = useState<SubdomainCheck | null>(null);

  const runCheck = async (value: string) => {
    setText(null);
    // Guests have no session: the check would send them to log in.
    if (!signedIn) {
      setCheck(
        isAllowedSubdomain(value)
          ? null
          : {
              state: "not-allowed",
              slug: value,
              suggestion: value ? suggestSubdomain(value) : undefined,
            },
      );
      return;
    }
    setCheck(await checkSubdomain(value, (path) => authenticatedFetch(path)));
  };

  // A result is shown only while the field still holds the name it was for.
  const current = check?.slug === slug ? check : null;
  const message = current ? subdomainCheckMessage(current) : serverIssue;
  const bad = current
    ? current.state === "taken" || current.state === "not-allowed"
    : Boolean(serverIssue);
  const suggestion = current && "suggestion" in current ? current.suggestion : undefined;

  return (
    <div className="grid gap-2 text-xs font-bold">
      <label htmlFor="portfolio-subdomain">VeriWorkly subdomain</label>
      <div className="flex">
        <input
          id="portfolio-subdomain"
          className={input}
          value={text ?? slug}
          aria-invalid={bad || undefined}
          aria-describedby="portfolio-subdomain-status"
          onChange={(e) => {
            setText(e.target.value.toLowerCase());
            updateSlug(e.target.value);
          }}
          onBlur={() => void runCheck(slug)}
        />
        <span className="border-line bg-paper text-muted flex items-center rounded-r-lg border border-l-0 px-3 text-[11px]">
          .veriworkly.com
        </span>
      </div>
      <p
        id="portfolio-subdomain-status"
        role="status"
        className={`font-medium normal-case ${bad ? "text-danger" : current?.state === "available" ? "text-success" : "text-muted"}`}
      >
        {message ?? "Lowercase letters, numbers, and hyphens only. Free on every plan."}
        {suggestion ? (
          <>
            {" "}
            <button
              className="text-accent font-extrabold underline"
              onClick={() => {
                updateSlug(suggestion);
                void runCheck(suggestion);
              }}
              type="button"
            >
              Use {suggestion}
            </button>
          </>
        ) : null}
      </p>
    </div>
  );
}
