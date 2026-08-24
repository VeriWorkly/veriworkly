import React from "react";
import { Bug, HelpCircle, ShieldAlert } from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";

export const ContactFaqSidebar = () => {
  return (
    <Reveal delay={0.1} className="space-y-6">
      <div className="space-y-3 rounded-4xl border border-blue-500/15 bg-blue-500/4 p-6 dark:border-blue-500/10 dark:bg-blue-500/3">
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase dark:text-blue-400">
          Average reply time
        </p>
        <p className="text-3xl font-semibold tracking-tighter text-zinc-900 dark:text-white">
          24–48 hrs
        </p>
        <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          We&apos;re a small team. Every message reaches a real person, not a queue.
        </p>
      </div>

      <div className="space-y-4 rounded-4xl border border-zinc-200 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:p-8 dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
          Frequently asked topics
        </h3>
        <ul className="space-y-4 text-sm text-zinc-500 dark:text-zinc-400">
          <li className="flex gap-3">
            <HelpCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
            <div>
              <strong className="text-zinc-800 dark:text-zinc-200">General help</strong>
              <p className="mt-1 text-xs leading-5">
                For template usage, layout settings, and dashboard controls, search the FAQ or open
                a GitHub discussion.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <Bug
              className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
            <div>
              <strong className="text-zinc-800 dark:text-zinc-200">Bug reports</strong>
              <p className="mt-1 text-xs leading-5">
                If you find issues with exports, PDF downloads, or inputs, submit a ticket in our
                GitHub issue tracker with steps to reproduce.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <ShieldAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
            <div>
              <strong className="text-zinc-800 dark:text-zinc-200">Security issues</strong>
              <p className="mt-1 text-xs leading-5">
                Follow the private disclosure process in our security policy. Please do not report
                vulnerabilities in public issues or forums before we have had a chance to check and
                resolve them.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </Reveal>
  );
};

export default ContactFaqSidebar;
