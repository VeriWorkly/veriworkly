"use client";

import React from "react";
import type { ResumeData, ResumeCustomSection } from "@/types/resume";
import type { TemplateRenderProps } from "@/types/template";
import {
  RESUME_LAYOUT,
  RESUME_PAGE_HEIGHT_PX,
  RESUME_PAGE_WIDTH_PX,
} from "@/features/resume/constants/resume-layout";
import { FONT_FAMILY_MAP } from "@/features/documents/constants/fonts";
import { Header } from "./Header";
import { Section } from "./Section";
import { ExperienceItem } from "./ExperienceItem";
import { EducationItem } from "./EducationItem";
import { ProjectItem } from "./ProjectItem";
import { stripEmoji } from "@/features/documents/utils/strip-emoji";
import { isSectionVisible } from "@/features/documents/utils/section-helpers";
import {
  cleanResumeText,
  getResumeRenderStyle,
  hasCustomSectionContent,
  hasEducationContent,
  hasExperienceContent,
  hasProjectContent,
  hasResumeSectionContent,
  hasSkillGroupContent,
} from "@/features/documents/rendering/resume-rendering";

function renderCustomSection(
  section: ResumeCustomSection,
  customization: ResumeData["customization"],
) {
  const textColor = customization?.textColor || "#1f2937";
  const mutedTextColor = customization?.mutedTextColor || "#6b7280";
  const accentColor = customization?.accentColor || "#000000";
  const itemHeadingColor = customization?.sectionHeadingColor || accentColor;
  const borderColor = customization?.borderColor || "#e5e7eb";
  const renderStyle = { ...RESUME_LAYOUT, ...customization };

  return (
    <Section
      key={section.id}
      title={section.title}
      accentColor={accentColor}
      backgroundColor={renderStyle.sectionBackgroundColor}
      borderColor={borderColor}
      sectionSpacing={renderStyle.sectionSpacing}
    >
      <div className="space-y-4">
        {section.items
          .filter((item) => item.name || item.description || item.details.length)
          .map((item) => (
            <article className="break-inside-avoid space-y-1.5" key={item.id}>
              <div className="flex flex-col justify-between gap-0.5 sm:flex-row sm:items-baseline">
                <h3
                  className="text-base leading-tight font-semibold"
                  style={{ color: itemHeadingColor }}
                >
                  {stripEmoji(item.name)}
                </h3>
                {item.date && (
                  <p className="text-sm" style={{ color: mutedTextColor }}>
                    {stripEmoji(item.date)}
                  </p>
                )}
              </div>
              {item.issuer && (
                <p className="text-sm" style={{ color: mutedTextColor }}>
                  {stripEmoji(item.issuer)}
                </p>
              )}
              {item.description && (
                <p className="text-sm" style={{ color: textColor }}>
                  {stripEmoji(item.description)}
                </p>
              )}
              {item.details?.length > 0 && (
                <ul className="space-y-1 pl-5 text-sm" style={{ color: textColor }}>
                  {item.details.map((detail, index) => (
                    <li key={index} className="list-disc">
                      {stripEmoji(detail)}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
      </div>
    </Section>
  );
}

export const CleanProfessionalWeb: React.FC<TemplateRenderProps> = ({ resume }) => {
  if (!resume) return null;
  const {
    basics,
    experience,
    education,
    projects,
    skills,
    summary,
    customization,
    sections,
    customSections,
    links,
  } = resume;

  const accentColor = customization?.accentColor || "#000000";
  const textColor = customization?.textColor || "#1f2937";
  const mutedTextColor = customization?.mutedTextColor || "#6b7280";
  const borderColor = customization?.borderColor || "#e5e7eb";
  const bodyLineHeight = customization?.bodyLineHeight || RESUME_LAYOUT.bodyLineHeight;
  const renderStyle = getResumeRenderStyle(resume);
  const itemHeadingColor = renderStyle.sectionHeadingColor;
  const visibleExperience = experience.filter(hasExperienceContent);
  const visibleEducation = education.filter(hasEducationContent);
  const visibleProjects = projects.filter(hasProjectContent);
  const visibleSkills = skills.filter(hasSkillGroupContent);
  const visibleCustomSections = customSections.filter(
    (section) => isSectionVisible(sections, section.kind) && hasCustomSectionContent(section),
  );

  const showBasics = hasResumeSectionContent(resume, "basics");
  const showSummary = hasResumeSectionContent(resume, "summary");
  const showExperience = hasResumeSectionContent(resume, "experience");
  const showEducation = hasResumeSectionContent(resume, "education");
  const showProjects = hasResumeSectionContent(resume, "projects");
  const showSkills = hasResumeSectionContent(resume, "skills");

  return (
    <div
      id="resume-container"
      className="resume-page-preview mx-auto bg-white text-[0.9375rem] leading-relaxed"
      style={
        {
          "--resume-page-height": `${RESUME_PAGE_HEIGHT_PX}px`,
          "--resume-page-margin": `${Math.max(0, renderStyle.pagePadding)}px`,
          width: `${RESUME_PAGE_WIDTH_PX}px`,
          minHeight: `${RESUME_PAGE_HEIGHT_PX * 2}px`,
          padding: `${renderStyle.pagePadding}px`,
          backgroundColor: renderStyle.pageBackgroundColor,
          color: textColor,
          fontFamily:
            FONT_FAMILY_MAP[customization?.fontFamily as keyof typeof FONT_FAMILY_MAP] ||
            "system-ui, -apple-system, sans-serif",
        } as React.CSSProperties
      }
    >
      {showBasics && (
        <Header basics={basics} links={links} customization={customization} sections={sections} />
      )}

      {showSummary && (
        <Section
          title="Summary"
          accentColor={accentColor}
          backgroundColor={renderStyle.sectionBackgroundColor}
          borderColor={borderColor}
          sectionSpacing={renderStyle.sectionSpacing}
        >
          <p style={{ color: textColor, lineHeight: bodyLineHeight }}>{stripEmoji(summary)}</p>
        </Section>
      )}

      {showExperience && (
        <Section
          title="Experience"
          accentColor={accentColor}
          backgroundColor={renderStyle.sectionBackgroundColor}
          borderColor={borderColor}
          sectionSpacing={renderStyle.sectionSpacing}
        >
          <div className="space-y-4">
            {visibleExperience.map((exp) => (
              <ExperienceItem
                key={exp.id}
                experience={exp}
                headingColor={itemHeadingColor}
                textColor={textColor}
                mutedTextColor={mutedTextColor}
                bodyLineHeight={bodyLineHeight}
              />
            ))}
          </div>
        </Section>
      )}

      {showEducation && (
        <Section
          title="Education"
          accentColor={accentColor}
          backgroundColor={renderStyle.sectionBackgroundColor}
          borderColor={borderColor}
          sectionSpacing={renderStyle.sectionSpacing}
        >
          <div className="space-y-4">
            {visibleEducation.map((edu) => (
              <EducationItem
                key={edu.id}
                education={edu}
                headingColor={itemHeadingColor}
                textColor={textColor}
                mutedTextColor={mutedTextColor}
              />
            ))}
          </div>
        </Section>
      )}

      {showProjects && (
        <Section
          title="Projects"
          accentColor={accentColor}
          backgroundColor={renderStyle.sectionBackgroundColor}
          borderColor={borderColor}
          sectionSpacing={renderStyle.sectionSpacing}
        >
          <div className="space-y-4">
            {visibleProjects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                headingColor={itemHeadingColor}
                textColor={textColor}
                mutedTextColor={mutedTextColor}
              />
            ))}
          </div>
        </Section>
      )}

      {showSkills && (
        <Section
          title="Skills"
          accentColor={accentColor}
          backgroundColor={renderStyle.sectionBackgroundColor}
          borderColor={borderColor}
          sectionSpacing={renderStyle.sectionSpacing}
        >
          <div className="flex flex-wrap gap-2">
            {visibleSkills.map((skill) => (
              <div key={skill.id || skill.name} className="w-full text-sm">
                <strong style={{ color: textColor }}>{cleanResumeText(skill.name)}:</strong>{" "}
                <span style={{ color: textColor }}>
                  {skill.keywords
                    .map((keyword) => cleanResumeText(keyword))
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {visibleCustomSections.map((section) => renderCustomSection(section, customization))}
    </div>
  );
};
