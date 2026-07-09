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
      <div className="absolute inset-0 bg-white p-6 shadow-sm flex flex-col pt-12">
        <div className="w-full text-center border-b border-zinc-200 pb-4 mb-4">
          <div className="h-4 w-3/4 mx-auto bg-zinc-900 mb-2 rounded-sm" />
          <div className="h-2 w-1/2 mx-auto bg-zinc-400 rounded-sm" />
        </div>
        <div className="space-y-4">
          <div className="h-2 w-24 bg-zinc-900 rounded-sm mb-2" />
          <div className="space-y-2">
            <div className="h-2 w-full bg-zinc-200 rounded-sm" />
            <div className="h-2 w-5/6 bg-zinc-200 rounded-sm" />
            <div className="h-2 w-4/5 bg-zinc-200 rounded-sm" />
          </div>
          <div className="h-2 w-24 bg-zinc-900 rounded-sm mb-2 mt-4" />
          <div className="space-y-2">
            <div className="h-2 w-full bg-zinc-200 rounded-sm" />
            <div className="h-2 w-[90%] bg-zinc-200 rounded-sm" />
            <div className="h-2 w-[85%] bg-zinc-200 rounded-sm" />
          </div>
        </div>
      </div>
    );
  }
  
  if (type === "Cover Letter") {
    return (
      <div className="absolute inset-0 bg-[#f9f9f9] p-8 shadow-sm flex flex-col pt-12">
        <div className="w-1/3 h-2 bg-zinc-900 mb-8 rounded-sm" />
        <div className="w-1/4 h-2 bg-zinc-400 mb-12 rounded-sm" />
        <div className="space-y-3">
          <div className="h-2 w-full bg-zinc-300 rounded-sm" />
          <div className="h-2 w-full bg-zinc-300 rounded-sm" />
          <div className="h-2 w-11/12 bg-zinc-300 rounded-sm" />
          <div className="h-2 w-full bg-zinc-300 rounded-sm" />
          <div className="h-2 w-4/5 bg-zinc-300 rounded-sm" />
        </div>
        <div className="w-1/4 h-2 bg-zinc-900 mt-12 rounded-sm" />
      </div>
    );
  }

  // Portfolio
  return (
    <div className="absolute inset-0 bg-zinc-950 p-4 shadow-sm flex flex-col pt-12">
      <div className="w-full h-32 bg-zinc-900 rounded-lg mb-4 flex items-center justify-center">
        <div className="w-12 h-12 bg-zinc-800 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-16 bg-zinc-900 rounded-lg" />
        <div className="h-16 bg-zinc-900 rounded-lg" />
        <div className="h-16 bg-zinc-900 rounded-lg" />
        <div className="h-16 bg-zinc-900 rounded-lg" />
      </div>
    </div>
  );
};

export default function TemplatesParallax() {
  const containerRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  useGSAP(() => {
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
      }
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
        }
      });
    });

  }, { scope: containerRef, dependencies: [reduce] });

  return (
    <section ref={containerRef} className="mx-auto w-full max-w-[1400px] px-4 py-32 md:px-8 md:py-48 bg-background">
      <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-8 border-b border-zinc-200 dark:border-zinc-800 pb-12">
        <div className="max-w-2xl">
          <h2 className="text-balance font-sans text-5xl font-medium tracking-tighter text-zinc-950 md:text-7xl dark:text-white">
            Designed for impact.
          </h2>
        </div>
        <p className="max-w-[40ch] text-balance text-lg text-zinc-600 dark:text-zinc-400">
          Start with premium, ATS-optimized templates that never compromise on aesthetics or structure.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 pb-24">
        {templates.map((template) => (
          <div
            key={template.name}
            className={`template-card group relative flex aspect-[3/4] w-full flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl ${template.offset}`}
          >
            <div className="absolute -inset-y-12 inset-x-0 overflow-hidden">
              <div 
                className="template-image absolute inset-0 transition-transform duration-1000 ease-out group-hover:scale-105"
                style={{ top: "-15%", height: "130%" }}
              >
                <CssMockup type={template.type} />
              </div>
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
            
            <div className="relative z-10 mt-auto p-6 flex flex-col items-start transform transition-transform duration-500 group-hover:-translate-y-2">
              <span className="mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-white backdrop-blur-md shadow-sm">
                {template.type}
              </span>
              <h3 className="text-2xl font-medium text-white tracking-tight">{template.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
