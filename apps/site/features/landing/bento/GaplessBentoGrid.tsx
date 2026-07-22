"use client";

import React, { useRef } from "react";
import { useScroll, useTransform, useSpring } from "framer-motion";
import { useMediaQuery } from "@/hooks/use-media-query";
import BentoResumeCard from "./BentoResumeCard";
import BentoCoverLetterCard from "./BentoCoverLetterCard";
import BentoPortfolioCard from "./BentoPortfolioCard";
import BentoPrivacyCard from "./BentoPrivacyCard";

const GaplessBentoGrid = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const col1YRaw = useTransform(scrollYProgress, [0, 1], isDesktop ? [40, -40] : [0, 0]);
  const col2YRaw = useTransform(scrollYProgress, [0, 1], isDesktop ? [-20, 20] : [0, 0]);

  const col1Y = useSpring(col1YRaw, { stiffness: 50, damping: 20 });
  const col2Y = useSpring(col2YRaw, { stiffness: 50, damping: 20 });

  const textXRaw = useTransform(scrollYProgress, [0, 1], [-40, 20]);
  const textX = useSpring(textXRaw, { stiffness: 45, damping: 18 });

  const portfolioTiltRaw = useTransform(scrollYProgress, [0, 1], [15, -15]);
  const portfolioTilt = useSpring(portfolioTiltRaw, { stiffness: 50, damping: 20 });

  return (
    <div
      ref={containerRef}
      className="grid grid-flow-dense auto-rows-[340px] grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4"
    >
      <BentoResumeCard yOffset={col1Y} canHover={canHover} />
      <BentoCoverLetterCard yOffset={col2Y} textX={textX} canHover={canHover} />
      <BentoPortfolioCard yOffset={col2Y} portfolioTilt={portfolioTilt} canHover={canHover} />
      <BentoPrivacyCard yOffset={col1Y} canHover={canHover} />
    </div>
  );
};

export default GaplessBentoGrid;
