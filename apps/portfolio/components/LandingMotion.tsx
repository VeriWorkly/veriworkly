"use client";

import { useEffect, type ReactNode } from "react";

const LandingMotion = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const marquee = document.querySelector<HTMLElement>("[data-marquee]");
    const progress = document.querySelector<HTMLElement>("[data-scroll-progress]");
    const tiltItems = Array.from(document.querySelectorAll<HTMLElement>("[data-tilt]"));
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const stackCards = Array.from(document.querySelectorAll<HTMLElement>("[data-stack-card]"));
    const parallaxItems = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    const spotlightItems = Array.from(document.querySelectorAll<HTMLElement>("[data-spotlight]"));

    if (reduceMotion) {
      revealItems.forEach((item) => {
        item.style.opacity = "1";
        item.style.transform = "none";
      });

      return;
    }

    revealItems.forEach((item) => {
      item.style.opacity = "0";
      item.style.transform = "translate3d(0, 42px, 0)";
      item.style.transition =
        "opacity 900ms cubic-bezier(.16,1,.3,1), transform 900ms cubic-bezier(.16,1,.3,1)";
      item.style.willChange = "opacity, transform";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const item = entry.target as HTMLElement;

            item.style.opacity = "1";
            item.style.transform = "translate3d(0, 0, 0)";

            observer.unobserve(entry.target);
          }
        });
      },

      { threshold: 0.14 },
    );

    revealItems.forEach((item) => observer.observe(item));

    let frame = 0;

    const updateScroll = () => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        const scrollRange = document.body.scrollHeight - window.innerHeight;
        const progressValue = Math.min(window.scrollY / Math.max(scrollRange, 1), 1);

        const viewportMid = window.scrollY + window.innerHeight * 0.5;

        if (progress) progress.style.transform = `scaleX(${progressValue})`;
        if (marquee) marquee.style.transform = `translate3d(${-progressValue * 42}%, 0, 0)`;

        stackCards.forEach((card, index) => {
          const rect = card.getBoundingClientRect();
          const center = window.scrollY + rect.top + rect.height * 0.5;

          const distance = Math.abs(viewportMid - center);
          const focus = Math.max(0, 1 - distance / window.innerHeight);

          card.style.transform = `translate3d(0, ${-focus * (index + 1) * 12}px, 0) rotate(${(index - 1) * 1.4}deg) scale(${0.94 + focus * 0.06})`;
          card.style.opacity = `${0.72 + focus * 0.28}`;
        });

        parallaxItems.forEach((item) => {
          const speed = Number(item.dataset.parallax || 0.08);
          const rect = item.getBoundingClientRect();

          const local = (rect.top - window.innerHeight * 0.5) * speed;
          const base = item.dataset.parallaxBase ? `${item.dataset.parallaxBase} ` : "";

          item.style.transform = `${base}translate3d(0, ${local}px, 0)`;
        });

        frame = 0;
      });
    };

    updateScroll();
    const updatePointer = (event: PointerEvent) => {
      spotlightItems.forEach((item) => {
        const rect = item.getBoundingClientRect();

        item.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
        item.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
      });

      tiltItems.forEach((item) => {
        const rect = item.getBoundingClientRect();

        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        const base = item.dataset.tiltBase ? `${item.dataset.tiltBase} ` : "";

        item.style.transform = `${base}perspective(1100px) rotateX(${-y * 4}deg) rotateY(${x * 5}deg)`;
      });
    };

    const resetTilt = () => {
      tiltItems.forEach((item) => {
        item.style.transform = item.dataset.tiltBase || "";
      });
    };

    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("pointermove", updatePointer, { passive: true });

    window.addEventListener("pointerleave", resetTilt);

    return () => {
      observer.disconnect();

      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("pointerleave", resetTilt);

      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return children;
};

export default LandingMotion;
