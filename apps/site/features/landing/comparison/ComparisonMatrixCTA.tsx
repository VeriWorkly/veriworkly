import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";

const ComparisonMatrixCTA = () => {
  return (
    <div className="mt-12 flex flex-col items-center gap-4">
      <Link
        href={siteConfig.links.app}
        className="group relative inline-flex h-14 items-center justify-center gap-3 rounded-full bg-zinc-950 px-8 text-base font-bold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
      >
        Start Building Free
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </Link>
      <p className="text-xs text-zinc-400 dark:text-zinc-600">
        No credit card. No account. No catch.
      </p>
    </div>
  );
};

export default ComparisonMatrixCTA;
