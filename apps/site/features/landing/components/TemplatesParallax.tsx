"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "framer-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const templates = [
  { name: "Executive", type: "Resume", offset: "mt-0" },
  { name: "Creative", type: "Portfolio", offset: "mt-0 md:mt-16 lg:mt-32" },
  { name: "Technical", type: "Resume", offset: "mt-0 md:mt-8 lg:mt-12" },
  { name: "Editorial", type: "Cover Letter", offset: "mt-0 md:mt-24 lg:mt-48" },
];

const CssMockup = ({ type }: { type: string }) => {
  if (type === "Resume") {
    return (
      <div className="absolute inset-0 flex flex-col bg-white p-6 pt-12 shadow-sm">
        <div className="mb-4 w-full border-b border-zinc-200 pb-4 text-center">
          <div className="mx-auto mb-2 h-4 w-3/4 rounded-sm bg-zinc-900" />
          <div className="mx-auto h-2 w-1/2 rounded-sm bg-zinc-400" />
        </div>
        <div className="space-y-4">
          <div className="mb-2 h-2 w-24 rounded-sm bg-zinc-900" />
          <div className="space-y-2">
            <div className="h-2 w-full rounded-sm bg-zinc-200" />
            <div className="h-2 w-5/6 rounded-sm bg-zinc-200" />
            <div className="h-2 w-4/5 rounded-sm bg-zinc-200" />
          </div>
          <div className="mt-4 mb-2 h-2 w-24 rounded-sm bg-zinc-900" />
          <div className="space-y-2">
            <div className="h-2 w-full rounded-sm bg-zinc-200" />
            <div className="h-2 w-[90%] rounded-sm bg-zinc-200" />
            <div className="h-2 w-[85%] rounded-sm bg-zinc-200" />
          </div>
        </div>
      </div>
    );
  }

  if (type === "Cover Letter") {
    return (
      <div className="absolute inset-0 flex flex-col bg-[#f9f9f9] p-8 pt-12 shadow-sm">
        <div className="mb-8 h-2 w-1/3 rounded-sm bg-zinc-900" />
        <div className="mb-12 h-2 w-1/4 rounded-sm bg-zinc-400" />
        <div className="space-y-3">
          <div className="h-2 w-full rounded-sm bg-zinc-300" />
          <div className="h-2 w-full rounded-sm bg-zinc-300" />
          <div className="h-2 w-11/12 rounded-sm bg-zinc-300" />
          <div className="h-2 w-full rounded-sm bg-zinc-300" />
          <div className="h-2 w-4/5 rounded-sm bg-zinc-300" />
        </div>
        <div className="mt-12 h-2 w-1/4 rounded-sm bg-zinc-900" />
      </div>
    );
  }

  // Portfolio
  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-950 p-4 pt-12 shadow-sm">
      <div className="mb-4 flex h-32 w-full items-center justify-center rounded-lg bg-zinc-900">
        <div className="h-12 w-12 rounded-full bg-zinc-800" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-16 rounded-lg bg-zinc-900" />
        <div className="h-16 rounded-lg bg-zinc-900" />
        <div className="h-16 rounded-lg bg-zinc-900" />
        <div className="h-16 rounded-lg bg-zinc-900" />
      </div>
    </div>
  );
};

export default function TemplatesParallax() {
  const containerRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  useGSAP(
    () => {
      if (reduce || !containerRef.current) return;

      const cards = gsap.utils.toArray<HTMLElement>(".template-card");

      gsap.from(cards, {
        y: 100,
        opacity: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          end: "top 20%",
          toggleActions: "play none none reverse",
        },
      });

      const images = gsap.utils.toArray<HTMLElement>(".template-image");
      images.forEach((img) => {
        gsap.to(img, {
          yPercent: 15,
          ease: "none",
          scrollTrigger: {
            trigger: img.parentElement,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });
    },
    { scope: containerRef, dependencies: [reduce] },
  );

  return (
    <section
      ref={containerRef}
      className="bg-background mx-auto w-full max-w-[1400px] px-4 py-32 md:px-8 md:py-48"
    >
      <div className="mb-24 flex flex-col items-end justify-between gap-8 border-b border-zinc-200 pb-12 md:flex-row dark:border-zinc-800">
        <div className="max-w-2xl">
          <h2 className="font-sans text-5xl font-medium tracking-tighter text-balance text-zinc-950 md:text-7xl dark:text-white">
            Designed for impact.
          </h2>
        </div>
        <p className="max-w-[40ch] text-lg text-balance text-zinc-600 dark:text-zinc-400">
          Start with premium, ATS-optimized templates that never compromise on aesthetics or
          structure.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 pb-24 md:grid-cols-2 lg:grid-cols-4">
        {templates.map((template) => (
          <div
            key={template.name}
            className={`template-card group relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 ${template.offset}`}
          >
            <div className="absolute inset-x-0 -inset-y-12 overflow-hidden">
              <div
                className="template-image absolute inset-0 transition-transform duration-1000 ease-out group-hover:scale-105"
                style={{ top: "-15%", height: "130%" }}
              >
                <CssMockup type={template.type} />
              </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-100" />

            <div className="relative z-10 mt-auto flex transform flex-col items-start p-6 transition-transform duration-500 group-hover:-translate-y-2">
              <span className="mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[10px] tracking-widest text-white uppercase shadow-sm backdrop-blur-md">
                {template.type}
              </span>
              <h3 className="text-2xl font-medium tracking-tight text-white">{template.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
