import { ChevronDown } from "lucide-react";

import { faqs } from "@/features/landing/faq/data/faqItems";

/**
 * Native `<details>` so every answer is in the HTML the page's FAQPage markup describes.
 * The previous version mounted an answer only while open, which left the structured data
 * pointing at text that was not on the page (W-005). `name` makes the group exclusive, so
 * opening one card closes the others without any script.
 */

const FAQCard = ({ index }: { index: number }) => {
  const faq = faqs[index];
  const number = String(index + 1).padStart(2, "0");

  return (
    <details
      name="landing-faq"
      className="group relative overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-xs transition-all duration-300 open:border-blue-500/25 open:bg-blue-50/40 open:shadow-md hover:border-zinc-300 hover:shadow-md dark:border-zinc-800/80 dark:bg-[#080808] dark:open:border-blue-500/20 dark:open:bg-blue-500/4 dark:hover:border-zinc-700"
    >
      <summary className="flex w-full cursor-pointer list-none items-center gap-4 p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 font-mono text-xs font-bold text-zinc-400 transition-colors duration-300 group-open:bg-blue-600 group-open:text-white dark:bg-zinc-900 dark:text-zinc-600"
        >
          {number}
        </span>

        <span className="flex-1 text-base font-bold text-zinc-900 dark:text-white">
          {faq.question}
        </span>

        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-100 bg-zinc-50 text-zinc-400 transition-all duration-300 group-open:rotate-180 group-open:border-blue-500/30 group-open:bg-blue-500/10 group-open:text-blue-600 dark:border-zinc-800 dark:bg-zinc-900 dark:group-open:text-blue-400">
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </summary>

      <div className="px-6 pb-6">
        <p className="pl-13 text-[14px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {faq.answer}
        </p>
      </div>
    </details>
  );
};

const FAQList = () => {
  const columns = [0, 1].map((column) =>
    faqs.map((_, index) => index).filter((index) => index % 2 === column),
  );

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {columns.map((indexes, column) => (
        <div key={column} className="flex flex-col gap-5">
          {indexes.map((index) => (
            <FAQCard key={faqs[index].id} index={index} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default FAQList;
