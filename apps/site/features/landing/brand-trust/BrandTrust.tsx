import React from "react";
import BrandTrustMarquee from "./BrandTrustMarquee";

const BrandTrust = () => {
  return (
    <section className="relative w-full overflow-hidden border-y border-zinc-200/40 bg-zinc-50/20 py-8 dark:border-zinc-800/20 dark:bg-[#060606]/20">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-linear-to-r from-white to-transparent dark:from-black dark:to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-linear-to-l from-white to-transparent dark:from-black dark:to-transparent" />

      <div className="mx-auto flex max-w-350 flex-col items-center gap-y-4 px-6 md:px-8">
        <span className="text-[10px] font-black tracking-[0.25em] text-zinc-400 uppercase select-none dark:text-zinc-500">
          Backed by core tech stack
        </span>
        <div className="w-full overflow-hidden">
          <BrandTrustMarquee />
        </div>
      </div>
    </section>
  );
};

export default BrandTrust;
