"use client";

import React from "react";

import type { ResumeData } from "@/types/resume";
import { formatDateRange } from "@/features/resume/services/resume-formatters";
import { cleanResumeText } from "@/features/documents/rendering/resume-rendering";

interface ExperienceItemProps {
  experience: ResumeData["experience"][0];
  headingColor: string;
  textColor: string;
  mutedTextColor: string;
  bodyLineHeight: number;
}

export const ExperienceItem: React.FC<ExperienceItemProps> = ({
  experience,
  headingColor,
  textColor,
  mutedTextColor,
  bodyLineHeight,
}) => {
  const meta = [cleanResumeText(experience.company), cleanResumeText(experience.location)]
    .filter(Boolean)
    .join(" | ");

  return (
    <article className="break-inside-avoid space-y-1.5">
      <div className="flex flex-col justify-between gap-0.5 sm:flex-row sm:items-baseline">
        <h3 className="text-base leading-tight font-semibold" style={{ color: headingColor }}>
          {cleanResumeText(experience.role)}
        </h3>
        <p className="text-sm" style={{ color: mutedTextColor }}>
          {formatDateRange(experience.startDate, experience.endDate, experience.current)}
        </p>
      </div>
      {meta && (
        <p className="text-sm" style={{ color: mutedTextColor }}>
          {meta}
        </p>
      )}
      {experience.summary && (
        <p className="text-sm" style={{ color: textColor, lineHeight: bodyLineHeight }}>
          {cleanResumeText(experience.summary)}
        </p>
      )}
      {experience.highlights?.length > 0 && (
        <ul className="space-y-1 pl-5 text-sm" style={{ color: textColor }}>
          {experience.highlights.map((highlight, index) => (
            <li key={index} className="list-disc">
              {cleanResumeText(highlight)}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
};
