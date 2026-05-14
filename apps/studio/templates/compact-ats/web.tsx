"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import type { ResumeData } from "@/types/resume";
import type { TemplateRenderProps } from "@/types/template";
import {
  RESUME_PAGE_HEIGHT_PX,
  RESUME_PAGE_WIDTH_PX,
} from "@/features/resume/constants/resume-layout";
import { FONT_FAMILY_MAP } from "@/features/documents/constants/fonts";
import { formatDateRange } from "@/features/resume/services/resume-formatters";
import {
  cleanResumeText,
  getContactItems,
  getEducationMeta,
  getEducationTitle,
  getLinkDisplayText,
  getProjectLinkText,
  getProjectTitle,
  getResumeRenderStyle,
  hasCustomItemContent,
  hasCustomSectionContent,
  hasEducationContent,
  hasExperienceContent,
  hasProjectContent,
  hasResumeSectionContent,
  hasSkillGroupContent,
  normalizeLinkHref,
} from "@/features/documents/rendering/resume-rendering";
import { SOCIAL_ICON_SRC_BY_TYPE } from "@/templates/shared/social-icons";

function Section({
  children,
  resume,
  title,
}: {
  children: React.ReactNode;
  resume: ResumeData;
  title: string;
}) {
  const style = getResumeRenderStyle(resume);

  return (
    <section
      className="break-inside-avoid-page"
      style={{
        backgroundColor: style.sectionBackgroundColor,
        marginBottom: Math.max(10, style.sectionSpacing * 0.6),
      }}
    >
      <div
        className="mb-2 border-b pb-1 text-[0.72rem] leading-none font-bold tracking-[0.16em] uppercase"
        style={{ borderColor: style.borderColor, color: style.accentColor }}
      >
        {title}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export const CompactAtsWeb: React.FC<TemplateRenderProps> = ({ resume }) => {
  if (!resume) return null;
  const style = getResumeRenderStyle(resume);
  const pagePadding = Math.max(24, style.pagePadding * 0.85);
  const contactItems = getContactItems(resume.basics);
  const renderedLinks = resume.links.items.filter((link) => normalizeLinkHref(link.url));
  const visibleExperience = resume.experience.filter(hasExperienceContent);
  const visibleEducation = resume.education.filter(hasEducationContent);
  const visibleProjects = resume.projects.filter(hasProjectContent);
  const visibleSkills = resume.skills.filter(hasSkillGroupContent);
  const visibleCustomSections = resume.customSections.filter(
    (section) => hasResumeSectionContent(resume, section.kind) && hasCustomSectionContent(section),
  );

  return (
    <div
      id="resume-container"
      className="resume-page-preview mx-auto bg-white text-[0.875rem]"
      style={
        {
          "--resume-page-height": `${RESUME_PAGE_HEIGHT_PX}px`,
          "--resume-page-margin": `${pagePadding}px`,
          width: `${RESUME_PAGE_WIDTH_PX}px`,
          minHeight: `${RESUME_PAGE_HEIGHT_PX * 2}px`,
          padding: `${pagePadding}px`,
          backgroundColor: style.pageBackgroundColor,
          color: style.textColor,
          fontFamily: FONT_FAMILY_MAP[style.fontFamily],
          lineHeight: style.bodyLineHeight,
        } as React.CSSProperties
      }
    >
      {(hasResumeSectionContent(resume, "basics") || hasResumeSectionContent(resume, "links")) && (
        <header className="mb-4 border-b pb-3" style={{ borderColor: style.borderColor }}>
          {hasResumeSectionContent(resume, "basics") && (
            <>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1
                  className="text-2xl leading-tight font-bold"
                  style={{ color: style.accentColor }}
                >
                  {cleanResumeText(resume.basics.fullName) || "Your Name"}
                </h1>
                {(resume.basics.headline || resume.basics.role) && (
                  <p className="text-sm font-semibold" style={{ color: style.mutedTextColor }}>
                    {cleanResumeText(resume.basics.headline || resume.basics.role)}
                  </p>
                )}
              </div>

              {contactItems.length > 0 && (
                <div
                  className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs"
                  style={{ color: style.mutedTextColor }}
                >
                  {contactItems.map((item, index) => (
                    <React.Fragment key={item.key}>
                      {index > 0 && <span>|</span>}
                      {item.href ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </>
          )}

          {hasResumeSectionContent(resume, "links") && renderedLinks.length > 0 && (
            <div
              className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
              style={{ color: style.mutedTextColor }}
            >
              {renderedLinks.map((link, index) => (
                <React.Fragment key={link.id || index}>
                  {index > 0 && <span>|</span>}
                  <a
                    className="inline-flex items-center gap-1 leading-none"
                    href={normalizeLinkHref(link.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {resume.links.displayMode !== "url" && (
                      <img
                        alt=""
                        aria-hidden="true"
                        className="size-3 shrink-0"
                        src={SOCIAL_ICON_SRC_BY_TYPE[link.type] || SOCIAL_ICON_SRC_BY_TYPE.custom}
                      />
                    )}
                    {resume.links.displayMode !== "icon" &&
                      getLinkDisplayText(link, resume.links.displayMode)}
                  </a>
                </React.Fragment>
              ))}
            </div>
          )}
        </header>
      )}

      {hasResumeSectionContent(resume, "summary") && (
        <Section title="Summary" resume={resume}>
          <p>{cleanResumeText(resume.summary)}</p>
        </Section>
      )}

      {hasResumeSectionContent(resume, "experience") && (
        <Section title="Experience" resume={resume}>
          {visibleExperience.map((item) => (
            <article key={item.id} className="break-inside-avoid space-y-1">
              <div className="flex justify-between gap-4">
                <h3 className="font-bold" style={{ color: style.sectionHeadingColor }}>
                  {cleanResumeText(item.role) || "Role"}
                </h3>
                <p className="shrink-0 text-xs" style={{ color: style.mutedTextColor }}>
                  {formatDateRange(item.startDate, item.endDate, item.current)}
                </p>
              </div>
              <p className="text-xs font-semibold" style={{ color: style.mutedTextColor }}>
                {[cleanResumeText(item.company), cleanResumeText(item.location)]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
              {item.summary && <p>{cleanResumeText(item.summary)}</p>}
              {item.highlights.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-5">
                  {item.highlights.map((highlight, index) => (
                    <li key={index}>{cleanResumeText(highlight)}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </Section>
      )}

      {hasResumeSectionContent(resume, "education") && (
        <Section title="Education" resume={resume}>
          {visibleEducation.map((item) => (
            <article key={item.id} className="break-inside-avoid space-y-1">
              <div className="flex justify-between gap-4">
                <h3 className="font-bold" style={{ color: style.sectionHeadingColor }}>
                  {getEducationTitle(item) || "Education"}
                </h3>
                <p className="shrink-0 text-xs" style={{ color: style.mutedTextColor }}>
                  {getEducationMeta(item)}
                </p>
              </div>
              {item.summary && <p>{cleanResumeText(item.summary)}</p>}
            </article>
          ))}
        </Section>
      )}

      {hasResumeSectionContent(resume, "projects") && (
        <Section title="Projects" resume={resume}>
          {visibleProjects.map((item) => (
            <article key={item.id} className="break-inside-avoid space-y-1">
              <div className="flex justify-between gap-4">
                <h3 className="font-bold" style={{ color: style.sectionHeadingColor }}>
                  {getProjectTitle(item) || "Project"}
                </h3>
                {normalizeLinkHref(item.link) && (
                  <a
                    className="shrink-0 text-xs"
                    href={normalizeLinkHref(item.link)}
                    style={{ color: style.mutedTextColor }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {getProjectLinkText(item)}
                  </a>
                )}
              </div>
              {item.skills?.length > 0 && (
                <p className="text-xs font-semibold" style={{ color: style.mutedTextColor }}>
                  {item.skills
                    .map((skill) => cleanResumeText(skill))
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {item.summary && <p>{cleanResumeText(item.summary)}</p>}
              {item.highlights.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-5">
                  {item.highlights.map((highlight, index) => (
                    <li key={index}>{cleanResumeText(highlight)}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </Section>
      )}

      {hasResumeSectionContent(resume, "skills") && (
        <Section title="Skills" resume={resume}>
          {visibleSkills.map((skill) => (
            <p key={skill.id || skill.name}>
              <strong>{cleanResumeText(skill.name)}:</strong>{" "}
              {skill.keywords
                .map((keyword) => cleanResumeText(keyword))
                .filter(Boolean)
                .join(", ")}
            </p>
          ))}
        </Section>
      )}

      {visibleCustomSections.map((section) => (
        <Section key={section.id} title={cleanResumeText(section.title)} resume={resume}>
          {section.items.filter(hasCustomItemContent).map((item) => (
            <article key={item.id} className="break-inside-avoid space-y-1">
              <div className="flex justify-between gap-4">
                <h3 className="font-bold" style={{ color: style.sectionHeadingColor }}>
                  {cleanResumeText(item.name) || "Item"}
                </h3>
                {item.date && (
                  <p className="shrink-0 text-xs" style={{ color: style.mutedTextColor }}>
                    {cleanResumeText(item.date)}
                  </p>
                )}
              </div>
              {[cleanResumeText(item.issuer), cleanResumeText(item.link)].filter(Boolean).length >
                0 && (
                <p className="text-xs font-semibold" style={{ color: style.mutedTextColor }}>
                  {[cleanResumeText(item.issuer), cleanResumeText(item.link)]
                    .filter(Boolean)
                    .join(" | ")}
                </p>
              )}
              {item.description && <p>{cleanResumeText(item.description)}</p>}
              {item.details.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-5">
                  {item.details.map((detail, index) => (
                    <li key={index}>{cleanResumeText(detail)}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </Section>
      ))}
    </div>
  );
};
