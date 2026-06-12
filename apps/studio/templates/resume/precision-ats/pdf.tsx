"use client";

import React from "react";
import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { ResumeData } from "@/types/resume";
import type { PdfTemplateProps } from "@/templates/resume/pdf/types";
import { FONT_REGISTRY } from "@/features/documents/constants/fonts";
import {
  RESUME_PAGE_HEIGHT_PT,
  RESUME_PAGE_WIDTH_PT,
  pxToPt,
} from "@/features/resume/constants/resume-layout";
import { formatDateRange } from "@/features/resume/services/resume-formatters";
import {
  cleanResumeText,
  getEducationMeta,
  getEducationTitle,
  getLinkDisplayText,
  getProjectLinkText,
  getProjectTitle,
  getResumeRenderModel,
  getResumeRenderStyle,
  hasCustomItemContent,
  hasResumeSectionContent,
  normalizeLinkHref,
} from "@/features/documents/rendering/resume-rendering";
import { PdfSocialIcon } from "../../pdf/SocialIcon";

function makeStyles(resume: ResumeData) {
  const style = getResumeRenderStyle(resume);
  const font = FONT_REGISTRY[style.fontFamily];

  return StyleSheet.create({
    page: {
      width: RESUME_PAGE_WIDTH_PT,
      minHeight: RESUME_PAGE_HEIGHT_PT,
      padding: pxToPt(Math.max(24, style.pagePadding * 0.85)),
      backgroundColor: style.pageBackgroundColor,
      color: style.textColor,
      fontFamily: font.primaryFamily,
      fontSize: pxToPt(13),
      lineHeight: style.bodyLineHeight,
    },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: style.borderColor,
      paddingBottom: pxToPt(12),
      marginBottom: pxToPt(16),
    },
    nameRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "baseline",
      columnGap: pxToPt(10),
      rowGap: pxToPt(2),
    },
    name: {
      color: style.accentColor,
      fontSize: pxToPt(24),
      fontWeight: 700,
      lineHeight: 1.1,
    },
    role: {
      color: style.mutedTextColor,
      fontSize: pxToPt(13),
      fontWeight: 700,
    },
    inlineRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: pxToPt(6),
      rowGap: pxToPt(2),
      marginTop: pxToPt(6),
      color: style.mutedTextColor,
      fontSize: pxToPt(11),
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
      fontSize: pxToPt(11),
      lineHeight: 1,
      textDecoration: "none",
    },
    icon: {
      width: pxToPt(10),
      height: pxToPt(10),
    },
    section: {
      marginBottom: pxToPt(Math.max(10, style.sectionSpacing * 0.6)),
      backgroundColor: style.sectionBackgroundColor,
    },
    sectionTitle: {
      borderBottomWidth: 1,
      borderBottomColor: style.borderColor,
      color: style.accentColor,
      fontSize: pxToPt(10),
      fontWeight: 700,
      letterSpacing: 1.1,
      marginBottom: pxToPt(7),
      paddingBottom: pxToPt(4),
      textTransform: "uppercase",
    },
    item: {
      marginBottom: pxToPt(8),
    },
    itemHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      columnGap: pxToPt(10),
      marginBottom: pxToPt(2),
    },
    itemTitle: {
      color: style.sectionHeadingColor || style.accentColor,
      flexGrow: 1,
      fontSize: pxToPt(13),
      fontWeight: 700,
      lineHeight: 1.15,
    },
    meta: {
      color: style.mutedTextColor,
      fontSize: pxToPt(11),
      fontWeight: 700,
      marginBottom: pxToPt(2),
    },
    body: {
      color: style.textColor,
      fontSize: pxToPt(13),
      lineHeight: style.bodyLineHeight,
      marginBottom: pxToPt(2),
    },
    bulletRow: {
      flexDirection: "row",
      columnGap: pxToPt(4),
      marginBottom: pxToPt(1),
      paddingLeft: pxToPt(10),
    },
    bullet: {
      width: pxToPt(5),
      color: style.textColor,
    },
    bulletText: {
      color: style.textColor,
      flexGrow: 1,
      fontSize: pxToPt(13),
      lineHeight: style.bodyLineHeight,
    },
    skillRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: pxToPt(2),
    },
    strong: {
      color: style.textColor,
      fontWeight: 700,
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
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
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

export function CompactAtsPdf({ resume }: PdfTemplateProps) {
  const styles = makeStyles(resume);
  const {
    style: renderStyle,
    contactItems,
    renderedLinks,
    visibleExperience,
    visibleEducation,
    visibleProjects,
    visibleSkills,
    visibleCustomSections,
  } = getResumeRenderModel(resume);

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
              <View style={styles.inlineRow}>
                {renderedLinks.map((link, index) => (
                  <React.Fragment key={link.id || index}>
                    {index > 0 && <Text>|</Text>}
                    <View style={styles.linkInner}>
                      {resume.links.displayMode !== "url" && (
                        <Link src={normalizeLinkHref(link.url)} style={styles.icon}>
                          <PdfSocialIcon
                            color={renderStyle.mutedTextColor}
                            size={pxToPt(10)}
                            type={link.type}
                          />
                        </Link>
                      )}
                      {resume.links.displayMode !== "icon" && (
                        <Link src={normalizeLinkHref(link.url)} style={styles.linkText}>
                          {getLinkDisplayText(link, resume.links.displayMode)}
                        </Link>
                      )}
                    </View>
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
                  <Text style={styles.itemTitle}>{cleanResumeText(item.role) || "Role"}</Text>
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
                  <Text style={styles.itemTitle}>{getEducationTitle(item) || "Education"}</Text>
                  <Text style={styles.meta}>{getEducationMeta(item)}</Text>
                </View>
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
                  <Text style={styles.itemTitle}>{getProjectTitle(item) || "Project"}</Text>
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
            {visibleSkills.map((skill) => (
              <View key={skill.id || skill.name} style={styles.skillRow}>
                <Text style={styles.strong}>{cleanResumeText(skill.name)}: </Text>
                <Text style={styles.body}>
                  {skill.keywords
                    .map((keyword) => cleanResumeText(keyword))
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </View>
            ))}
          </SectionBlock>
        )}

        {visibleCustomSections.map((section) => (
          <SectionBlock key={section.id} title={cleanResumeText(section.title)} styles={styles}>
            {section.items.filter(hasCustomItemContent).map((item) => (
              <View key={item.id} style={styles.item} wrap={false}>
                <View style={styles.itemHead}>
                  <Text style={styles.itemTitle}>{cleanResumeText(item.name) || "Item"}</Text>
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
