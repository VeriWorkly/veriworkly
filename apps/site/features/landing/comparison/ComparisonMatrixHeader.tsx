import React from "react";
import { Scale } from "lucide-react";

const ComparisonMatrixHeader = () => {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-blue-500/10 bg-blue-500/5 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
        <Scale className="h-3.5 w-3.5" /> Compare
      </div>
      <h2 className="font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl lg:text-6xl dark:text-white">
        Compare VeriWorkly to subscription resume builders
      </h2>
      <p className="mx-auto mt-6 max-w-[52ch] text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
        Builders like Zety and Resume.io lure you in with a cheap trial, then quietly charge
        $24/month to unlock your own PDF. VeriWorkly stays free, private, and unlocked.
      </p>
    </div>
  );
};

export default ComparisonMatrixHeader;
