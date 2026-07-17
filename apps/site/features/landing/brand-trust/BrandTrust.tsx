import React from "react";

interface Logo {
  name: string;
  svg: React.ReactNode;
}

const logos: Logo[] = [
  {
    name: "Next.js",
    svg: (
      <svg className="h-5 w-auto" viewBox="0 0 180 180" fill="none" aria-hidden="true">
        <circle cx="90" cy="90" r="90" fill="currentColor" />
        <path
          d="M149.5 157.5L69.1 54H54V126H67.1V70.8L136.9 160.8C141.3 159.9 145.5 158.8 149.5 157.5Z"
          fill="var(--background, #000)"
        />
        <rect x="115" y="54" width="13" height="72" fill="var(--background, #000)" />
      </svg>
    ),
  },
  {
    name: "React",
    svg: (
      <svg className="h-5 w-auto" viewBox="-11.5 -10.2 23 20.4" fill="currentColor" aria-hidden="true">
        <circle cx="0" cy="0" r="2.05" />
        <g stroke="currentColor" strokeWidth="1" fill="none">
          <ellipse rx="11" ry="4.2" />
          <ellipse rx="11" ry="4.2" transform="rotate(60)" />
          <ellipse rx="11" ry="4.2" transform="rotate(120)" />
        </g>
      </svg>
    ),
  },
  {
    name: "Dodo Payments",
    svg: (
      <svg className="h-5 w-auto" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    svg: (
      <svg className="h-5 w-auto" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    svg: (
      <svg className="h-5 w-auto" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
      </svg>
    ),
  },
];

const MarqueeRow = () => {
  // Duplicate logos 4 times for enough screen coverage and seamless wrapping
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
            <span className="text-[11px] font-mono tracking-widest uppercase whitespace-nowrap">
              {logo.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function BrandTrust() {
  return (
    <section className="relative w-full overflow-hidden border-y border-zinc-200/40 bg-zinc-50/20 py-8 dark:border-zinc-800/20 dark:bg-[#060606]/20">
      {/* Absolute overlay masks for soft fade at edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-linear-to-r from-white to-transparent dark:from-black dark:to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-linear-to-l from-white to-transparent dark:from-black dark:to-transparent" />

      <div className="mx-auto flex max-w-350 flex-col items-center gap-y-4 px-6 md:px-8">
        <span className="text-[10px] font-black tracking-[0.25em] text-zinc-400 uppercase select-none dark:text-zinc-500">
          Backed by core tech stack
        </span>
        <div className="w-full overflow-hidden">
          <MarqueeRow />
        </div>
      </div>
    </section>
  );
}
