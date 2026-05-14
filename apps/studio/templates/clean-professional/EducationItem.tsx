"use client";

import React from "react";

import type { ResumeData } from "@/types/resume";
import {
  cleanResumeText,
  getEducationMeta,
  getEducationSchool,
  getEducationTitle,
} from "@/features/documents/rendering/resume-rendering";

interface EducationItemProps {
  education: ResumeData["education"][0];
  headingColor: string;
  textColor: string;
  mutedTextColor: string;
}

export const EducationItem: React.FC<EducationItemProps> = ({
  education,
  headingColor,
  textColor,
  mutedTextColor,
}) => {
  return (
    <article className="break-inside-avoid space-y-1">
      <div className="flex flex-col justify-between gap-0.5 sm:flex-row sm:items-baseline">
        <h3 className="text-base leading-tight font-semibold" style={{ color: headingColor }}>
          {getEducationTitle(education) || "Education"}
        </h3>
        <p className="text-sm" style={{ color: mutedTextColor }}>
          {getEducationMeta(education)}
        </p>
      </div>
      {getEducationSchool(education) && (
        <p className="text-sm font-medium" style={{ color: mutedTextColor }}>
          {getEducationSchool(education)}
        </p>
      )}
      {education.summary && (
        <p className="text-sm" style={{ color: textColor }}>
          {cleanResumeText(education.summary)}
        </p>
      )}
    </article>
  );
};
