import React from "react";
import { logos } from "./BrandTrustLogos";

const BrandTrustMarquee = () => {
  const duplicatedLogos = [...logos, ...logos, ...logos, ...logos];

  return (
    <div className="relative flex w-full overflow-hidden py-2 select-none">
      <style>{`
        @keyframes marquee-flow {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee-flow {
          display: flex;
          width: max-content;
          animation: marquee-flow 25s linear infinite;
        }
        @media (hover: hover) and (pointer: fine) {
          .animate-marquee-flow:hover {
            animation-play-state: paused;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee-flow {
            animation: none;
          }
        }
      `}</style>
      <div className="animate-marquee-flow flex gap-x-16 pr-16">
        {duplicatedLogos.map((logo, index) => (
          <div
            key={`${logo.name}-${index}`}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap text-zinc-400/60 transition-all duration-300 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300"
            title={logo.name}
          >
            {logo.svg}
            <span className="font-mono text-[11px] tracking-widest whitespace-nowrap uppercase">
              {logo.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrandTrustMarquee;
