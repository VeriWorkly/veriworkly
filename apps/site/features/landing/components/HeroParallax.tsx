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

  useGSAP(() => {
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
        .map(word => `<span class="inline-block opacity-0 translate-y-6">${word}</span>`)
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

    tl.from(descRef.current, {
      opacity: 0,
      y: 20,
      duration: 0.6,
      ease: "power3.out"
    }, "-=0.4");

    tl.from(ctaRef.current, {
      opacity: 0,
      y: 20,
      duration: 0.6,
      ease: "power3.out"
    }, "-=0.4");

    tl.from(trustRef.current, {
      opacity: 0,
      y: 15,
      duration: 0.6,
      ease: "power3.out"
    }, "-=0.3");

    // Float initial animations for document mockup layers
    tl.from([layerResumeRef.current, layerLetterRef.current, layerPortfolioRef.current], {
      opacity: 0,
      scale: 0.9,
      y: "+=60",
      duration: 1,
      stagger: 0.15,
      ease: "elastic.out(1, 0.75)"
    }, "-=0.6");

    // 2. Mouse move interactive parallax (only on desktop/pointer devices)
    const isMobile = window.matchMedia("(max-width: 1024px)").matches;
    
    if (!isMobile) {
      const quickXResume = gsap.quickTo(layerResumeRef.current, "x", { duration: 0.8, ease: "power3.out" });
      const quickYResume = gsap.quickTo(layerResumeRef.current, "y", { duration: 0.8, ease: "power3.out" });
      
      const quickXLetter = gsap.quickTo(layerLetterRef.current, "x", { duration: 1.2, ease: "power3.out" });
      const quickYLetter = gsap.quickTo(layerLetterRef.current, "y", { duration: 1.2, ease: "power3.out" });
      
      const quickXPortfolio = gsap.quickTo(layerPortfolioRef.current, "x", { duration: 0.6, ease: "power3.out" });
      const quickYPortfolio = gsap.quickTo(layerPortfolioRef.current, "y", { duration: 0.6, ease: "power3.out" });

      const quickXGlow = gsap.quickTo(spotlightRef.current, "xPercent", { duration: 1.5, ease: "power2.out" });
      const quickYGlow = gsap.quickTo(spotlightRef.current, "yPercent", { duration: 1.5, ease: "power2.out" });

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
        scrub: true
      }
    });

    // Letter layer floats up
    gsap.to(layerLetterRef.current, {
      yPercent: -20,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });

    // Portfolio layer moves faster
    gsap.to(layerPortfolioRef.current, {
      yPercent: -45,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });

    // Ambient background lights move
    gsap.to(layerBgRef.current, {
      yPercent: 10,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });

  }, { scope: containerRef });

  return (
    <section 
      ref={containerRef}
      className="relative min-h-[90vh] lg:min-h-[95dvh] flex items-center justify-between overflow-hidden pt-28 pb-16 px-4 md:px-8 max-w-7xl mx-auto"
    >
      {/* Dynamic Parallax Background Spotlight */}
      <div 
        ref={layerBgRef}
        className="absolute inset-0 pointer-events-none z-0"
      >
        <div 
          ref={spotlightRef}
          className="absolute -top-1/4 -right-1/4 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-gradient-to-br from-blue-600/10 to-indigo-500/5 rounded-full blur-3xl opacity-80"
        />
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-8 items-center">
        {/* Left Side Content */}
        <div className="flex flex-col justify-center space-y-8 text-left max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-600 text-xs font-semibold uppercase tracking-wider w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The local-first AI workspace</span>
          </div>

          <h1 
            ref={titleRef}
            className="text-foreground text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.035em] leading-[1.08] text-balance"
          >
            Build professional resumes, cover letters & portfolios in minutes.
          </h1>

          <p 
            ref={descRef}
            className="text-muted/90 text-base md:text-lg leading-relaxed text-balance"
          >
            A privacy-first career workspace. Sync documents dynamically from your Master Profile, custom-tailor sections instantly, and publish gorgeous portfolios to custom subdomains.
          </p>

          <div 
            ref={ctaRef}
            className="flex flex-wrap gap-4 items-center"
          >
            <Button asChild size="lg" className="h-14 px-8 text-base font-semibold group shadow-lg hover:shadow-blue-500/10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-300">
              <Link href={siteConfig.links.app} className="flex items-center gap-2">
                Start Building Free
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>

            <Button asChild size="lg" variant="secondary" className="h-14 px-8 text-base font-medium text-foreground hover:bg-black/5 bg-transparent border border-border rounded-xl transition-colors duration-200">
              <Link href="https://docs.veriworkly.com">
                Read Docs
              </Link>
            </Button>
          </div>

          {/* Core Trust items */}
          <div 
            ref={trustRef}
            className="pt-6 border-t border-border/60 grid grid-cols-3 gap-4"
          >
            <div>
              <p className="text-foreground text-2xl font-bold tracking-tight">No Login</p>
              <p className="text-muted text-xs mt-1">Start editing instantly</p>
            </div>
            <div>
              <p className="text-foreground text-2xl font-bold tracking-tight">100% Private</p>
              <p className="text-muted text-xs mt-1">Local-first data lock</p>
            </div>
            <div>
              <p className="text-foreground text-2xl font-bold tracking-tight">Open Core</p>
              <p className="text-muted text-xs mt-1">Fully audit-ready</p>
            </div>
          </div>
        </div>

        {/* Right Side Parallax Document Showcase */}
        <div className="relative h-[480px] sm:h-[550px] w-full flex items-center justify-center lg:justify-end z-20">
          
          {/* Layer 1: The Base / Grid Canvas */}
          <div className="absolute inset-0 bg-radial-grid opacity-30 pointer-events-none rounded-3xl" />

          {/* Layer 2: Portfolio Mock (Deepest/Bottom layer) */}
          <div 
            ref={layerPortfolioRef}
            className="absolute right-2 bottom-4 w-[280px] sm:w-[320px] aspect-[4/3] bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.15)] border border-border/80 p-4 select-none"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <span className="text-[10px] text-muted bg-neutral-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
                <Compass className="w-2.5 h-2.5 text-blue-500" />
                alex.veriworkly.me
              </span>
              <Share2 className="w-3.5 h-3.5 text-muted" />
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 mb-2 flex items-center justify-center text-white text-xs font-bold shadow-sm">AD</div>
              <div className="h-4 bg-foreground/10 rounded w-2/3" />
              <div className="h-3 bg-muted/10 rounded w-1/2" />
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="h-16 rounded bg-neutral-50 dark:bg-zinc-800/50 border border-border/40 p-2 space-y-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500/20" />
                  <div className="h-2 bg-foreground/10 rounded w-4/5" />
                </div>
                <div className="h-16 rounded bg-neutral-50 dark:bg-zinc-800/50 border border-border/40 p-2 space-y-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20" />
                  <div className="h-2 bg-foreground/10 rounded w-3/4" />
                </div>
              </div>
            </div>
          </div>

          {/* Layer 3: Cover Letter Layer (Mid layer) */}
          <div 
            ref={layerLetterRef}
            className="absolute left-2 top-8 w-[240px] sm:w-[270px] aspect-[1/1.3] bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.2)] border border-border/80 p-5 select-none"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span className="text-[11px] font-bold text-foreground">Cover Letter</span>
                </div>
                <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">Synced</span>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted/10 rounded w-1/3" />
                <div className="h-3 bg-muted/10 rounded w-1/4" />
                <div className="pt-2 space-y-1.5">
                  <div className="h-2.5 bg-foreground/10 rounded w-full" />
                  <div className="h-2.5 bg-foreground/10 rounded w-[95%]" />
                  <div className="h-2.5 bg-foreground/10 rounded w-[90%]" />
                  <div className="h-2.5 bg-foreground/10 rounded w-full" />
                  <div className="h-2.5 bg-foreground/10 rounded w-3/4" />
                </div>
              </div>
            </div>
          </div>

          {/* Layer 4: Resume Card (Top / Prominent layer) */}
          <div 
            ref={layerResumeRef}
            className="absolute left-10 top-12 w-[290px] sm:w-[330px] aspect-[1/1.3] bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_30px_70px_-25px_rgba(0,0,0,0.25)] border-2 border-blue-500/80 p-5 select-none z-10"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase">AI Tailored Resume</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ATS: 98%
              </span>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Alex Developer</h3>
                <p className="text-[10px] text-muted">San Francisco, CA • alex@dev.io</p>
              </div>
              
              <div className="border-t border-border/80 pt-3 space-y-2">
                <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Experience</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-foreground">Senior Software Engineer</span>
                    <span className="text-[9px] text-muted">2024 - Present</span>
                  </div>
                  <div className="h-2 bg-blue-600/10 rounded w-full" />
                  <div className="h-2 bg-foreground/10 rounded w-11/12" />
                  <div className="h-2 bg-foreground/5 rounded w-5/6" />
                </div>
              </div>

              <div className="border-t border-border/80 pt-3 space-y-2">
                <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[9px] bg-neutral-100 dark:bg-zinc-800 text-foreground px-2 py-0.5 rounded-md border border-border/40 font-mono">React</span>
                  <span className="text-[9px] bg-neutral-100 dark:bg-zinc-800 text-foreground px-2 py-0.5 rounded-md border border-border/40 font-mono">TypeScript</span>
                  <span className="text-[9px] bg-neutral-100 dark:bg-zinc-800 text-foreground px-2 py-0.5 rounded-md border border-border/40 font-mono">Next.js</span>
                  <span className="text-[9px] bg-neutral-100 dark:bg-zinc-800 text-foreground px-2 py-0.5 rounded-md border border-border/40 font-mono">Tailwind</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
