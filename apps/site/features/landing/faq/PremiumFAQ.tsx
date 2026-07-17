import { MessageCircleQuestion } from "lucide-react";

import FAQList from "@/features/landing/faq/FAQList";

export default function PremiumFAQ() {
  return (
    <section className="mx-auto w-full max-w-300 border-t border-zinc-200/40 px-6 py-32 md:px-8 md:py-48 dark:border-zinc-800/20">
      <div className="mb-16 text-center">
        <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-blue-500/10 bg-blue-500/5 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
          <MessageCircleQuestion className="h-3.5 w-3.5" /> Support
        </div>
        <h2 className="font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl lg:text-6xl dark:text-white">
          Frequently asked questions
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-500 dark:text-zinc-400">
          Everything you need to know about VeriWorkly&apos;s privacy-first features.
        </p>
      </div>

      <FAQList />
    </section>
  );
}
