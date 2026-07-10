"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";
import { Sparkles, FileText, CheckCircle2, ChevronRight, Share2, Compass } from "lucide-react";

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

export default function HeroParallax() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);

  // Parallax elements refs
  const layerBgRef = useRef<HTMLDivElement>(null);
  const layerResumeRef = useRef<HTMLDivElement>(null);
  const layerLetterRef = useRef<HTMLDivElement>(null);
  const layerPortfolioRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Set initial layout offsets and rotations on cards to avoid CSS transform conflicts
      gsap.set(layerPortfolioRef.current, { rotation: -4, x: -20, y: 40 });
      gsap.set(layerLetterRef.current, { rotation: 6, x: 20, y: -20 });
      gsap.set(layerResumeRef.current, { rotation: -1, x: 0, y: 0 });

      // 1. Text entrance animation
      const tl = gsap.timeline();

      // Split heading by words for a staggered reveal
      if (titleRef.current) {
        const words = titleRef.current.innerText.split(" ");
        titleRef.current.innerHTML = words
          .map((word) => `<span class="inline-block opacity-0 translate-y-6">${word}</span>`)
          .join(" ");

        const spans = titleRef.current.querySelectorAll("span");
        tl.to(spans, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.05,
          ease: "power4.out",
        });
      }

      tl.from(
        descRef.current,
        {
          opacity: 0,
          y: 20,
          duration: 0.6,
          ease: "power3.out",
        },
        "-=0.4",
      );

      tl.from(
        ctaRef.current,
        {
          opacity: 0,
          y: 20,
          duration: 0.6,
          ease: "power3.out",
        },
        "-=0.4",
      );

      tl.from(
        trustRef.current,
        {
          opacity: 0,
          y: 15,
          duration: 0.6,
          ease: "power3.out",
        },
        "-=0.3",
      );

      // Float initial animations for document mockup layers
      tl.from(
        [layerResumeRef.current, layerLetterRef.current, layerPortfolioRef.current],
        {
          opacity: 0,
          scale: 0.9,
          y: "+=60",
          duration: 1,
          stagger: 0.15,
          ease: "elastic.out(1, 0.75)",
        },
        "-=0.6",
      );

      // 2. Mouse move interactive parallax (only on desktop/pointer devices)
      const isMobile = window.matchMedia("(max-width: 1024px)").matches;

      if (!isMobile) {
        const quickXResume = gsap.quickTo(layerResumeRef.current, "x", {
          duration: 0.8,
          ease: "power3.out",
        });
        const quickYResume = gsap.quickTo(layerResumeRef.current, "y", {
          duration: 0.8,
          ease: "power3.out",
        });

        const quickXLetter = gsap.quickTo(layerLetterRef.current, "x", {
          duration: 1.2,
          ease: "power3.out",
        });
        const quickYLetter = gsap.quickTo(layerLetterRef.current, "y", {
          duration: 1.2,
          ease: "power3.out",
        });

        const quickXPortfolio = gsap.quickTo(layerPortfolioRef.current, "x", {
          duration: 0.6,
          ease: "power3.out",
        });
        const quickYPortfolio = gsap.quickTo(layerPortfolioRef.current, "y", {
          duration: 0.6,
          ease: "power3.out",
        });

        const quickXGlow = gsap.quickTo(spotlightRef.current, "xPercent", {
          duration: 1.5,
          ease: "power2.out",
        });
        const quickYGlow = gsap.quickTo(spotlightRef.current, "yPercent", {
          duration: 1.5,
          ease: "power2.out",
        });

        const handleMouseMove = (e: MouseEvent) => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();

          // Normalize mouse coordinates to relative -0.5 to 0.5
          const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
          const mouseY = (e.clientY - rect.top) / rect.height - 0.5;

          // Move spotlights
          quickXGlow(mouseX * 100);
          quickYGlow(mouseY * 100);

          // Move layers at different factor coefficients for depth feel
          quickXResume(mouseX * 35);
          quickYResume(mouseY * 35);

          quickXLetter(mouseX * -20);
          quickYLetter(mouseY * -20);

          quickXPortfolio(mouseX * 55);
          quickYPortfolio(mouseY * 55);
        };

        const container = containerRef.current;
        if (container) {
          container.addEventListener("mousemove", handleMouseMove);

          return () => {
            container.removeEventListener("mousemove", handleMouseMove);
          };
        }
      }

      // 3. Scroll Parallax Animations
      // Resume layer floats down
      gsap.to(layerResumeRef.current, {
        yPercent: 20,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Letter layer floats up
      gsap.to(layerLetterRef.current, {
        yPercent: -20,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Portfolio layer moves faster
      gsap.to(layerPortfolioRef.current, {
        yPercent: -45,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Ambient background lights move
      gsap.to(layerBgRef.current, {
        yPercent: 10,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { scope: containerRef },
  );

  return (
    <section
      ref={containerRef}
      className="relative mx-auto flex min-h-[90vh] max-w-7xl items-center justify-between overflow-hidden px-4 pt-28 pb-16 md:px-8 lg:min-h-[95dvh]"
    >
      {/* Dynamic Parallax Background Spotlight */}
      <div ref={layerBgRef} className="pointer-events-none absolute inset-0 z-0">
        <div
          ref={spotlightRef}
          className="absolute -top-1/4 -right-1/4 h-[80vw] max-h-[800px] w-[80vw] max-w-[800px] rounded-full bg-gradient-to-br from-blue-600/10 to-indigo-500/5 opacity-80 blur-3xl"
        />
        <div className="absolute top-1/2 left-1/4 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        {/* Left Side Content */}
        <div className="flex max-w-2xl flex-col justify-center space-y-8 text-left">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-500/20 bg-blue-600/10 px-3.5 py-1.5 text-xs font-semibold tracking-wider text-blue-600 uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            <span>The local-first AI workspace</span>
          </div>

          <h1
            ref={titleRef}
            className="text-foreground text-4xl leading-[1.08] font-bold tracking-[-0.035em] text-balance sm:text-5xl md:text-6xl"
          >
            Build professional resumes, cover letters & portfolios in minutes.
          </h1>

          <p
            ref={descRef}
            className="text-muted/90 text-base leading-relaxed text-balance md:text-lg"
          >
            A privacy-first career workspace. Sync documents dynamically from your Master Profile,
            custom-tailor sections instantly, and publish gorgeous portfolios to custom subdomains.
          </p>

          <div ref={ctaRef} className="flex flex-wrap items-center gap-4">
            <Button
              asChild
              size="lg"
              className="group h-14 rounded-xl bg-blue-600 px-8 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:bg-blue-700 hover:shadow-blue-500/10"
            >
              <Link href={siteConfig.links.app} className="flex items-center gap-2">
                Start Building Free
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="secondary"
              className="text-foreground border-border h-14 rounded-xl border bg-transparent px-8 text-base font-medium transition-colors duration-200 hover:bg-black/5"
            >
              <Link href="https://docs.veriworkly.com">Read Docs</Link>
            </Button>
          </div>

          {/* Core Trust items */}
          <div ref={trustRef} className="border-border/60 grid grid-cols-3 gap-4 border-t pt-6">
            <div>
              <p className="text-foreground text-2xl font-bold tracking-tight">No Login</p>
              <p className="text-muted mt-1 text-xs">Start editing instantly</p>
            </div>
            <div>
              <p className="text-foreground text-2xl font-bold tracking-tight">100% Private</p>
              <p className="text-muted mt-1 text-xs">Local-first data lock</p>
            </div>
            <div>
              <p className="text-foreground text-2xl font-bold tracking-tight">Open Core</p>
              <p className="text-muted mt-1 text-xs">Fully audit-ready</p>
            </div>
          </div>
        </div>

        {/* Right Side Parallax Document Showcase */}
        <div className="relative z-20 flex h-[480px] w-full items-center justify-center sm:h-[550px] lg:justify-end">
          {/* Layer 1: The Base / Grid Canvas */}
          <div className="bg-radial-grid pointer-events-none absolute inset-0 rounded-3xl opacity-30" />

          {/* Layer 2: Portfolio Mock (Deepest/Bottom layer) */}
          <div
            ref={layerPortfolioRef}
            className="border-border/80 absolute right-2 bottom-4 aspect-[4/3] w-[280px] rounded-2xl border bg-white p-4 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.15)] select-none sm:w-[320px] dark:bg-zinc-900"
          >
            <div className="border-border/60 mb-3 flex items-center justify-between border-b pb-2">
              <div className="flex gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
              <span className="text-muted flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                <Compass className="h-2.5 w-2.5 text-blue-500" />
                alex.veriworkly.me
              </span>
              <Share2 className="text-muted h-3.5 w-3.5" />
            </div>
            <div className="space-y-2">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
                AD
              </div>
              <div className="bg-foreground/10 h-4 w-2/3 rounded" />
              <div className="bg-muted/10 h-3 w-1/2 rounded" />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="border-border/40 h-16 space-y-1 rounded border bg-neutral-50 p-2 dark:bg-zinc-800/50">
                  <div className="h-3 w-3 rounded-full bg-blue-500/20" />
                  <div className="bg-foreground/10 h-2 w-4/5 rounded" />
                </div>
                <div className="border-border/40 h-16 space-y-1 rounded border bg-neutral-50 p-2 dark:bg-zinc-800/50">
                  <div className="h-3 w-3 rounded-full bg-emerald-500/20" />
                  <div className="bg-foreground/10 h-2 w-3/4 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Layer 3: Cover Letter Layer (Mid layer) */}
          <div
            ref={layerLetterRef}
            className="border-border/80 absolute top-8 left-2 aspect-[1/1.3] w-[240px] rounded-2xl border bg-white p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.2)] select-none sm:w-[270px] dark:bg-zinc-900"
          >
            <div className="space-y-4">
              <div className="border-border/50 flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-emerald-500" />
                  <span className="text-foreground text-[11px] font-bold">Cover Letter</span>
                </div>
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-950/60">
                  Synced
                </span>
              </div>
              <div className="space-y-2">
                <div className="bg-muted/10 h-3 w-1/3 rounded" />
                <div className="bg-muted/10 h-3 w-1/4 rounded" />
                <div className="space-y-1.5 pt-2">
                  <div className="bg-foreground/10 h-2.5 w-full rounded" />
                  <div className="bg-foreground/10 h-2.5 w-[95%] rounded" />
                  <div className="bg-foreground/10 h-2.5 w-[90%] rounded" />
                  <div className="bg-foreground/10 h-2.5 w-full rounded" />
                  <div className="bg-foreground/10 h-2.5 w-3/4 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Layer 4: Resume Card (Top / Prominent layer) */}
          <div
            ref={layerResumeRef}
            className="absolute top-12 left-10 z-10 aspect-[1/1.3] w-[290px] rounded-2xl border-2 border-blue-500/80 bg-white p-5 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.25)] select-none sm:w-[330px] dark:bg-zinc-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase dark:text-blue-400">
                AI Tailored Resume
              </span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                ATS: 98%
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-foreground text-base font-bold">Alex Developer</h3>
                <p className="text-muted text-[10px]">San Francisco, CA • alex@dev.io</p>
              </div>

              <div className="border-border/80 space-y-2 border-t pt-3">
                <h4 className="text-foreground text-[11px] font-bold tracking-wider uppercase">
                  Experience
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between">
                    <span className="text-foreground text-[10px] font-bold">
                      Senior Software Engineer
                    </span>
                    <span className="text-muted text-[9px]">2024 - Present</span>
                  </div>
                  <div className="h-2 w-full rounded bg-blue-600/10" />
                  <div className="bg-foreground/10 h-2 w-11/12 rounded" />
                  <div className="bg-foreground/5 h-2 w-5/6 rounded" />
                </div>
              </div>

              <div className="border-border/80 space-y-2 border-t pt-3">
                <h4 className="text-foreground text-[11px] font-bold tracking-wider uppercase">
                  Skills
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-foreground border-border/40 rounded-md border bg-neutral-100 px-2 py-0.5 font-mono text-[9px] dark:bg-zinc-800">
                    React
                  </span>
                  <span className="text-foreground border-border/40 rounded-md border bg-neutral-100 px-2 py-0.5 font-mono text-[9px] dark:bg-zinc-800">
                    TypeScript
                  </span>
                  <span className="text-foreground border-border/40 rounded-md border bg-neutral-100 px-2 py-0.5 font-mono text-[9px] dark:bg-zinc-800">
                    Next.js
                  </span>
                  <span className="text-foreground border-border/40 rounded-md border bg-neutral-100 px-2 py-0.5 font-mono text-[9px] dark:bg-zinc-800">
                    Tailwind
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
