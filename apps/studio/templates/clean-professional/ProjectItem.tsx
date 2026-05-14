"use client";

import React from "react";

import type { ResumeData } from "@/types/resume";
import {
  cleanResumeText,
  getProjectLinkText,
  getProjectTitle,
  normalizeLinkHref,
} from "@/features/documents/rendering/resume-rendering";

interface ProjectItemProps {
  project: ResumeData["projects"][0];
  headingColor: string;
  textColor: string;
  mutedTextColor: string;
}

export const ProjectItem: React.FC<ProjectItemProps> = ({
  project,
  headingColor,
  textColor,
  mutedTextColor,
}) => {
  const projectHref = normalizeLinkHref(project.link);

  return (
    <article className="break-inside-avoid space-y-1.5">
      <div className="flex flex-col justify-between gap-0.5 sm:flex-row sm:items-baseline">
        <h3 className="text-base leading-tight font-semibold" style={{ color: headingColor }}>
          {getProjectTitle(project) || "Project"}
        </h3>
        {projectHref && (
          <a
            href={projectHref}
            className="text-sm underline"
            style={{ color: mutedTextColor }}
            target="_blank"
            rel="noopener noreferrer"
          >
            {getProjectLinkText(project)}
          </a>
        )}
      </div>
      {project.skills?.length > 0 && (
        <p className="text-xs font-medium" style={{ color: mutedTextColor }}>
          {project.skills
            .map((skill) => cleanResumeText(skill))
            .filter(Boolean)
            .join(", ")}
        </p>
      )}
      {project.summary && (
        <p className="text-sm" style={{ color: textColor }}>
          {cleanResumeText(project.summary)}
        </p>
      )}
      {project.highlights?.length > 0 && (
        <ul className="space-y-1 pl-5 text-sm" style={{ color: textColor }}>
          {project.highlights.map((highlight, index) => (
            <li key={index} className="list-disc">
              {cleanResumeText(highlight)}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
};
