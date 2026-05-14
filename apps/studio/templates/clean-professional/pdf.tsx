"use client";

import React from "react";
import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { ResumeData } from "@/types/resume";
import type { PdfTemplateProps } from "@/templates/pdf/types";
import { FONT_REGISTRY } from "@/features/documents/constants/fonts";
import {
  RESUME_PAGE_HEIGHT_PT,
  RESUME_PAGE_WIDTH_PT,
  pxToPt,
} from "@/features/resume/constants/resume-layout";
import { formatDateRange } from "@/features/resume/services/resume-formatters";
import {
  cleanResumeText,
  getContactItems,
  getEducationMeta,
  getEducationSchool,
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
import { PdfSocialIcon } from "@/templates/pdf/SocialIcon";

function makeStyles(resume: ResumeData) {
  const style = getResumeRenderStyle(resume);
  const font = FONT_REGISTRY[style.fontFamily];

  return StyleSheet.create({
    page: {
      width: RESUME_PAGE_WIDTH_PT,
      minHeight: RESUME_PAGE_HEIGHT_PT,
      padding: pxToPt(style.pagePadding),
      backgroundColor: style.pageBackgroundColor,
      color: style.textColor,
      fontFamily: font.primaryFamily,
      fontSize: pxToPt(14),
      lineHeight: style.bodyLineHeight,
    },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: style.borderColor,
      paddingBottom: pxToPt(18),
      marginBottom: pxToPt(18),
    },
    nameRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "baseline",
      columnGap: pxToPt(9),
      rowGap: pxToPt(3),
      marginBottom: pxToPt(6),
    },
    name: {
      color: style.accentColor,
      fontSize: pxToPt(30),
      fontWeight: 700,
      lineHeight: style.headingLineHeight,
    },
    role: {
      color: style.mutedTextColor,
      fontSize: pxToPt(18),
      fontWeight: 500,
      lineHeight: style.headingLineHeight,
    },
    inlineRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: pxToPt(8),
      rowGap: pxToPt(4),
      color: style.mutedTextColor,
      fontSize: pxToPt(14),
    },
    linkRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      columnGap: pxToPt(8),
      rowGap: pxToPt(4),
      color: style.mutedTextColor,
      fontSize: pxToPt(14),
      marginTop: pxToPt(6),
    },
    link: {
      color: style.mutedTextColor,
      textDecoration: "none",
    },
    linkInner: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: pxToPt(3),
    },
    linkText: {
      color: style.mutedTextColor,
      fontSize: pxToPt(14),
      lineHeight: 1,
    },
    iconBadge: {
      width: pxToPt(12),
      height: pxToPt(12),
    },
    section: {
      marginBottom: pxToPt(style.sectionSpacing),
      backgroundColor: style.sectionBackgroundColor,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: pxToPt(9),
      marginBottom: pxToPt(9),
    },
    rule: {
      height: 1,
      backgroundColor: style.borderColor,
      flexGrow: 1,
    },
    sectionTitle: {
      color: style.accentColor,
      fontSize: pxToPt(12),
      fontWeight: 700,
      textTransform: "uppercase",
      lineHeight: style.headingLineHeight,
    },
    item: {
      marginBottom: pxToPt(12),
    },
    itemHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      columnGap: pxToPt(10),
      marginBottom: pxToPt(3),
    },
    itemTitle: {
      color: style.textColor,
      fontSize: pxToPt(16),
      fontWeight: 700,
      flexGrow: 1,
      flexShrink: 1,
      lineHeight: style.headingLineHeight,
    },
    meta: {
      color: style.mutedTextColor,
      fontSize: pxToPt(14),
      marginBottom: pxToPt(4),
      flexShrink: 0,
    },
    body: {
      color: style.textColor,
      fontSize: pxToPt(14),
      lineHeight: style.bodyLineHeight,
      marginBottom: pxToPt(4),
    },
    bulletRow: {
      flexDirection: "row",
      columnGap: pxToPt(5),
      marginBottom: pxToPt(2),
      paddingLeft: pxToPt(10),
    },
    bullet: {
      width: pxToPt(6),
      color: style.textColor,
    },
    bulletText: {
      color: style.textColor,
      flexGrow: 1,
      fontSize: pxToPt(14),
      lineHeight: style.bodyLineHeight,
    },
    skillRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: pxToPt(4),
    },
    strong: {
      color: style.textColor,
      fontWeight: 700,
    },
    itemTitleAccent: {
      color: style.sectionHeadingColor || style.accentColor,
    },
  });
}

function SectionBlock({
  children,
  styles,
  title,
}: {
  children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.rule} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.rule} />
      </View>
      {children}
    </View>
  );
}

function LinkContent({
  displayMode,
  iconColor,
  link,
  styles,
}: {
  displayMode: ResumeData["links"]["displayMode"];
  iconColor: string;
  link: ResumeData["links"]["items"][number];
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.linkInner}>
      {displayMode !== "url" && (
        <Link src={normalizeLinkHref(link.url)} style={styles.iconBadge}>
          <PdfSocialIcon color={iconColor} size={pxToPt(12)} type={link.type} />
        </Link>
      )}
      {displayMode !== "icon" && (
        <Link src={normalizeLinkHref(link.url)} style={styles.linkText}>
          {getLinkDisplayText(link, displayMode)}
        </Link>
      )}
    </View>
  );
}

function BulletList({ items, styles }: { items: string[]; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View>
      {items.map((item, index) => {
        const text = cleanResumeText(item);
        if (!text) return null;

        return (
          <View key={`${text}-${index}`} style={styles.bulletRow}>
            <Text style={styles.bullet}>-</Text>
            <Text style={styles.bulletText}>{text}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function CleanProfessionalPdf({ resume }: PdfTemplateProps) {
  const styles = makeStyles(resume);
  const renderStyle = getResumeRenderStyle(resume);
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
    <Document title={`${cleanResumeText(resume.basics.fullName) || "Resume"} - Resume`}>
      <Page size={[RESUME_PAGE_WIDTH_PT, RESUME_PAGE_HEIGHT_PT]} style={styles.page}>
        {(hasResumeSectionContent(resume, "basics") ||
          hasResumeSectionContent(resume, "links")) && (
          <View style={styles.header}>
            {hasResumeSectionContent(resume, "basics") && (
              <>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>
                    {cleanResumeText(resume.basics.fullName) || "Your Name"}
                  </Text>
                  {(resume.basics.headline || resume.basics.role) && (
                    <Text style={styles.role}>
                      {cleanResumeText(resume.basics.headline || resume.basics.role)}
                    </Text>
                  )}
                </View>

                {contactItems.length > 0 && (
                  <View style={styles.inlineRow}>
                    {contactItems.map((item, index) => (
                      <React.Fragment key={item.key}>
                        {index > 0 && <Text>|</Text>}
                        {item.href ? (
                          <Link src={item.href} style={styles.link}>
                            {item.label}
                          </Link>
                        ) : (
                          <Text>{item.label}</Text>
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                )}
              </>
            )}

            {hasResumeSectionContent(resume, "links") && renderedLinks.length > 0 && (
              <View style={styles.linkRow}>
                {renderedLinks.map((link, index) => (
                  <React.Fragment key={link.id || index}>
                    {index > 0 && <Text>|</Text>}
                    <LinkContent
                      displayMode={resume.links.displayMode}
                      iconColor={renderStyle.mutedTextColor}
                      link={link}
                      styles={styles}
                    />
                  </React.Fragment>
                ))}
              </View>
            )}
          </View>
        )}

        {hasResumeSectionContent(resume, "summary") && (
          <SectionBlock title="Summary" styles={styles}>
            <Text style={styles.body}>{cleanResumeText(resume.summary)}</Text>
          </SectionBlock>
        )}

        {hasResumeSectionContent(resume, "experience") && (
          <SectionBlock title="Experience" styles={styles}>
            {visibleExperience.map((item) => (
              <View key={item.id} style={styles.item} wrap={false}>
                <View style={styles.itemHead}>
                  <Text style={[styles.itemTitle, styles.itemTitleAccent]}>
                    {cleanResumeText(item.role) || "Role"}
                  </Text>
                  <Text style={styles.meta}>
                    {formatDateRange(item.startDate, item.endDate, item.current)}
                  </Text>
                </View>
                <Text style={styles.meta}>
                  {[cleanResumeText(item.company), cleanResumeText(item.location)]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
                {item.summary && <Text style={styles.body}>{cleanResumeText(item.summary)}</Text>}
                <BulletList items={item.highlights} styles={styles} />
              </View>
            ))}
          </SectionBlock>
        )}

        {hasResumeSectionContent(resume, "education") && (
          <SectionBlock title="Education" styles={styles}>
            {visibleEducation.map((item) => (
              <View key={item.id} style={styles.item} wrap={false}>
                <View style={styles.itemHead}>
                  <Text style={[styles.itemTitle, styles.itemTitleAccent]}>
                    {getEducationTitle(item) || "Education"}
                  </Text>
                  <Text style={styles.meta}>{getEducationMeta(item)}</Text>
                </View>
                {getEducationSchool(item) && (
                  <Text style={styles.meta}>{getEducationSchool(item)}</Text>
                )}
                {item.summary && <Text style={styles.body}>{cleanResumeText(item.summary)}</Text>}
              </View>
            ))}
          </SectionBlock>
        )}

        {hasResumeSectionContent(resume, "projects") && (
          <SectionBlock title="Projects" styles={styles}>
            {visibleProjects.map((item) => (
              <View key={item.id} style={styles.item} wrap={false}>
                <View style={styles.itemHead}>
                  <Text style={[styles.itemTitle, styles.itemTitleAccent]}>
                    {getProjectTitle(item) || "Project"}
                  </Text>
                  {normalizeLinkHref(item.link) && (
                    <Link src={normalizeLinkHref(item.link)} style={styles.link}>
                      {getProjectLinkText(item)}
                    </Link>
                  )}
                </View>
                {item.skills?.length > 0 && (
                  <Text style={styles.meta}>
                    {item.skills
                      .map((skill) => cleanResumeText(skill))
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                )}
                {item.summary && <Text style={styles.body}>{cleanResumeText(item.summary)}</Text>}
                <BulletList items={item.highlights} styles={styles} />
              </View>
            ))}
          </SectionBlock>
        )}

        {hasResumeSectionContent(resume, "skills") && (
          <SectionBlock title="Skills" styles={styles}>
            {visibleSkills.map((skill) => {
              const keywords = skill.keywords
                .map((keyword) => cleanResumeText(keyword))
                .filter(Boolean)
                .join(", ");

              return (
                <View key={skill.id || skill.name} style={styles.skillRow}>
                  <Text style={styles.strong}>{cleanResumeText(skill.name)}: </Text>
                  <Text style={styles.body}>{keywords}</Text>
                </View>
              );
            })}
          </SectionBlock>
        )}

        {visibleCustomSections.map((section) => (
          <SectionBlock key={section.id} title={cleanResumeText(section.title)} styles={styles}>
            {section.items.filter(hasCustomItemContent).map((item) => (
              <View key={item.id} style={styles.item} wrap={false}>
                <View style={styles.itemHead}>
                  <Text style={[styles.itemTitle, styles.itemTitleAccent]}>
                    {cleanResumeText(item.name) || "Item"}
                  </Text>
                  {item.date && <Text style={styles.meta}>{cleanResumeText(item.date)}</Text>}
                </View>
                {[cleanResumeText(item.issuer), cleanResumeText(item.link)].filter(Boolean).length >
                  0 && (
                  <Text style={styles.meta}>
                    {[cleanResumeText(item.issuer), cleanResumeText(item.link)]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                )}
                {item.description && (
                  <Text style={styles.body}>{cleanResumeText(item.description)}</Text>
                )}
                <BulletList items={item.details} styles={styles} />
              </View>
            ))}
          </SectionBlock>
        ))}
      </Page>
    </Document>
  );
}
