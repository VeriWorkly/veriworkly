"use client";

import { useMediaQuery } from "@/hooks/use-media-query";

import BentoResumeCard from "./BentoResumeCard";
import BentoPrivacyCard from "./BentoPrivacyCard";
import BentoPortfolioCard from "./BentoPortfolioCard";
import BentoCoverLetterCard from "./BentoCoverLetterCard";

const GaplessBentoGrid = () => {
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");

  return (
    <div className="grid grid-flow-dense auto-rows-85 grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
      <BentoResumeCard drift="up" canHover={canHover} />
      <BentoCoverLetterCard drift="down" canHover={canHover} />
      <BentoPortfolioCard drift="down" canHover={canHover} />
      <BentoPrivacyCard drift="up" canHover={canHover} />
    </div>
  );
};

export default GaplessBentoGrid;
