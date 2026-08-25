import { Scale } from "lucide-react";

const ComparisonMatrixHeader = () => {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-blue-500/10 bg-blue-500/5 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
        <Scale className="h-3.5 w-3.5" /> Compare
      </div>

      <h2 className="font-sans text-3xl font-semibold tracking-tighter text-balance text-zinc-900 sm:text-4xl md:text-5xl lg:text-6xl dark:text-white">
        Compare VeriWorkly to subscription resume builders
      </h2>

      <p className="mx-auto mt-5 max-w-[52ch] text-base leading-relaxed text-zinc-500 sm:mt-6 sm:text-lg dark:text-zinc-400">
        Most traditional tools require recurring monthly subscriptions just to download your own
        PDF. VeriWorkly gives you open-source, local-first creation with unlocked ATS PDFs and
        portfolios forever.
      </p>
    </div>
  );
};

export default ComparisonMatrixHeader;
