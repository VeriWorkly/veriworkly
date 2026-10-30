"use client";

import React from "react";
import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { ResumeData } from "@/types/resume";
import type {
  ResumeRenderModel,
  ResumeRenderStyle,
} from "@/features/documents/rendering/resume-rendering";
import type { PdfTemplateProps } from "@/templates/resume/pdf/types";
import type { ResumeRenderItem } from "./model";
import type { ResumeTokens } from "./tokens";
import type { ResumeTypeScale } from "./typography";
import type { ResumeSectionStart } from "./keep-together";
import type { StackedHeaderOptions } from "./stacked-header";

import { getPdfFontStack } from "@/features/documents/constants/fonts";
import { getPdfMetadata } from "@/templates/shared/pdf-metadata";
import { needsLastResortPdfFont } from "@/features/documents/export/pdf-unsupported-text";
import { RESUME_SPACING_LIMITS, pxToPt } from "@/features/resume/constants/resume-layout";
import { getPageGeometry } from "@/templates/shared/page-geometry";
import {
  getLinkDisplayText,
  getResumeRenderModel,
  normalizeLinkHref,
} from "@/features/documents/rendering/resume-rendering";
import { PdfSocialIcon } from "../../pdf/SocialIcon";
import { buildResumeSections, getSkillLineText } from "./model";
import { createResumeTokens } from "./tokens";
import { HEADING_PRESENCE_LINES, createResumeKeepTogether, getTextWidths } from "./keep-together";
import { pdfFixedWidth, pdfFlexible } from "@/templates/shared/box";
import { pdfText } from "@/templates/shared/text-tokens";
import { BULLET_MARKER } from "./typography";

type ResumePdfStyles = ReturnType<typeof createResumePdfStyles>;

type PdfViewStyle = NonNullable<React.ComponentProps<typeof View>["style"]>;

export interface ResumePdfContext {
  model: ResumeRenderModel;
  resume: ResumeData;
  scale: ResumeTypeScale;
  style: ResumeRenderStyle;
  styles: ResumePdfStyles;
  tokens: ResumeTokens;
}

export interface ResumePdfSkin {
  scale: ResumeTypeScale;
  itemLayout?: "stacked" | "gutter";
  pagePadding?: (padding: number) => number;
  sectionSpacing?: (spacing: number) => number;
  renderHeader: (ctx: ResumePdfContext) => React.ReactNode;
  renderSectionHeading: (title: string, ctx: ResumePdfContext) => React.ReactNode;
}

/**
 * Base stylesheet every PDF skin extends.
 *
 * Every spatial value goes through `pxToPt`. A bare number here would be read
 * as points and render 1.333x too large — that is the single most common way
 * this file drifts away from `./web.tsx`.
 *
 * Every wrapping paragraph also states an explicit width. See `textColumn`
 * below: without one, react-pdf breaks the lines at the wrong measure.
 */
export function createResumePdfStyles(
  style: ResumeRenderStyle,
  scale: ResumeTypeScale,
  pagePadding: number,
  layout: "stacked" | "gutter" = "stacked",
  withLastResortFont = false,
) {
  const tokens = createResumeTokens(style, scale);

  /**
   * The width of the page's text area, and of the column an item's prose sits
   * in — narrower than the page when a skin puts dates in a left gutter.
   *
   * These have to be stated rather than left to flex, because `@react-pdf/layout`
   * breaks a `Text` into lines exactly once, on Yoga's first measure pass, and
   * then refuses to redo it:
   *
   *     const shouldLayoutText = (node) => isText(node) && !node.lines;
   *
   * For a `Text` sized by flex, that first pass proposes the *container's*
   * width, so the lines are broken at 730px and the box is afterwards resolved
   * to 590px. The text then overruns its column and is clipped at the page
   * edge, while the preview — which measures after layout — wraps correctly.
   * Giving the node a definite width makes the first measure the right one.
   */
  const { contentWidth, columnWidth } = getTextWidths(style, scale, pagePadding, layout);
  const page = getPageGeometry(style.paperSize);

  const textColumn = (width: number) => ({ width: pxToPt(width), maxWidth: pxToPt(width) });

  return StyleSheet.create({
    page: {
      backgroundColor: style.pageBackgroundColor,
      color: style.textColor,
      fontFamily: getPdfFontStack(style.fontFamily, withLastResortFont),
      fontSize: pxToPt(scale.body),
      lineHeight: style.bodyLineHeight,
      minHeight: page.heightPt,
      padding: pxToPt(pagePadding),
      width: page.widthPt,
    },

    name: pdfText(tokens.name),
    role: pdfText(tokens.role),
    contact: pdfText(tokens.contact),
    sectionTitle: { ...pdfText(tokens.sectionTitle), textTransform: "uppercase" },
    itemTitle: { ...pdfText(tokens.itemTitle), ...pdfFlexible },
    // Content-sized and shrinkable in both engines. react-pdf cannot express
    // "never shrink" for a box without a known width (`flexShrink: 0` is read
    // as 1), so the web deliberately does not claim it either.
    headMeta: { ...pdfText(tokens.headMeta), flexGrow: 0, flexShrink: 1, minWidth: 0 },
    gutterMeta: pdfText(tokens.gutterMeta),
    subtitle: { ...pdfText(tokens.subtitle), ...textColumn(columnWidth) },
    /** An item's prose, inside the item column. */
    body: { ...pdfText(tokens.body), ...textColumn(columnWidth) },
    /** A paragraph that is a direct child of a section, spanning the page. */
    sectionText: { ...pdfText(tokens.body), ...textColumn(contentWidth) },

    inlineRow: {
      columnGap: pxToPt(scale.inlineGapX),
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: pxToPt(scale.inlineGapY),
    },
    linkInner: {
      alignItems: "center",
      columnGap: pxToPt(scale.iconGap),
      flexDirection: "row",
    },
    icon: {
      ...pdfFixedWidth(scale.contact),
      height: pxToPt(scale.contact),
    },

    rule: {
      backgroundColor: style.borderColor,
      flexGrow: 1,
      height: pxToPt(scale.hairline),
    },

    itemRow: {
      columnGap: pxToPt(scale.gutterGap),
      flexDirection: "row",
      ...textColumn(contentWidth),
    },
    gutter: pdfFixedWidth(scale.gutterWidth),
    // Definite, not flexible. Yoga measures a text node before it resolves the
    // flex line, and react-pdf keeps whichever width that first pass proposed
    // (see `textColumn`), so every ancestor of a paragraph states its width and
    // leaves nothing to infer.
    itemBody: { ...pdfFlexible, ...textColumn(columnWidth) },
    itemHead: {
      alignItems: "flex-start",
      columnGap: pxToPt(scale.headGap),
      flexDirection: "row",
      justifyContent: "space-between",
      ...textColumn(columnWidth),
    },

    /** A section, and a stacked item — both span the page's text area. */
    section: textColumn(contentWidth),
    itemColumn: textColumn(contentWidth),

    bulletList: textColumn(columnWidth),
    bulletRow: {
      columnGap: pxToPt(scale.bulletGap),
      flexDirection: "row",
      ...textColumn(columnWidth),
    },
    // The marker column is a View, not a styled Text: react-pdf measures Text
    // nodes and lets the measured width win over the declared one, which left
    // the marker column a quarter pixel narrower than the web's.
    bulletMarkerColumn: pdfFixedWidth(scale.bulletIndent - scale.bulletGap),
    bulletMarker: {
      ...pdfText(tokens.body),
      textAlign: "right",
    },
    // The marker column and the gap between it and the text together make up
    // `bulletIndent`, so the text occupies the rest of the item column.
    bulletText: { ...pdfText(tokens.body), ...textColumn(columnWidth - scale.bulletIndent) },

    strong: {
      color: style.textColor,
      fontWeight: 700,
    },
  });
}

// ---------------------------------------------------------------------------
// Header building blocks shared by every skin
// ---------------------------------------------------------------------------

export function PdfContactRow({
  ctx,
  justify = "flex-start",
  separator = "|",
  style: extraStyle,
}: {
  ctx: ResumePdfContext;
  justify?: "flex-start" | "center" | "flex-end";
  separator?: string;
  style?: PdfViewStyle;
}) {
  const { model, styles } = ctx;

  if (model.contactItems.length === 0) return null;

  return (
    <View
      style={[
        styles.inlineRow,
        styles.contact,
        { justifyContent: justify },
        extraStyle ?? {},
      ].flat()}
    >
      {model.contactItems.map((item, index) => (
        <React.Fragment key={item.key}>
          {index > 0 && <Text style={styles.contact}>{separator}</Text>}
          {item.href ? (
            <Link src={item.href} style={[styles.contact, { textDecoration: "none" }]}>
              {item.label}
            </Link>
          ) : (
            <Text style={styles.contact}>{item.label}</Text>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

export function PdfLinkRow({
  ctx,
  justify = "flex-start",
  separator = "|",
  style: extraStyle,
}: {
  ctx: ResumePdfContext;
  justify?: "flex-start" | "center" | "flex-end";
  separator?: string;
  style?: PdfViewStyle;
}) {
  const { model, resume, style, styles } = ctx;

  if (!model.showLinks || model.renderedLinks.length === 0) return null;

  const displayMode = resume.links.displayMode;

  return (
    <View
      style={[
        styles.inlineRow,
        styles.contact,
        { alignItems: "center" as const, justifyContent: justify },
        extraStyle ?? {},
      ].flat()}
    >
      {model.renderedLinks.map((link, index) => (
        <React.Fragment key={link.id || index}>
          {index > 0 && <Text style={styles.contact}>{separator}</Text>}
          <View style={styles.linkInner}>
            {displayMode !== "url" && (
              <Link src={normalizeLinkHref(link.url)} style={styles.icon}>
                <PdfSocialIcon
                  color={style.mutedTextColor}
                  size={pxToPt(ctx.scale.contact)}
                  type={link.type}
                />
              </Link>
            )}
            {displayMode !== "icon" && (
              <Link
                src={normalizeLinkHref(link.url)}
                style={[styles.contact, { textDecoration: "none" }]}
              >
                {getLinkDisplayText(link, displayMode)}
              </Link>
            )}
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Item rendering
// ---------------------------------------------------------------------------

function PdfItem({
  ctx,
  item,
  keepTogether,
  layout,
  spacingTop,
}: {
  ctx: ResumePdfContext;
  item: ResumeRenderItem;
  keepTogether: boolean;
  layout: "stacked" | "gutter";
  spacingTop: number;
}) {
  const { scale, styles } = ctx;
  const rootSpacing = spacingTop > 0 ? { marginTop: pxToPt(spacingTop) } : {};

  const showLinkInHead = !item.meta && Boolean(item.link);
  const subtitleText = [item.subtitle, !showLinkInHead && item.link ? item.link.text : ""]
    .filter(Boolean)
    .join(" | ");

  const headMeta = showLinkInHead ? (
    <Link src={item.link?.href ?? ""} style={[styles.headMeta, { textDecoration: "none" }]}>
      {item.link?.text}
    </Link>
  ) : item.meta ? (
    <Text style={styles.headMeta}>{item.meta}</Text>
  ) : null;

  // The web separates these rows with a flex `gap`; the equivalent without a
  // leading or trailing gap is "margin-top on every row but the first".
  const rowGap = pxToPt(scale.itemRowGap);
  const rows: React.ReactNode[] = [];
  const spacing = () => (rows.length === 0 ? {} : { marginTop: rowGap });

  rows.push(
    <View key="head" style={[styles.itemHead, spacing()].flat()}>
      {/* Mirrors shared/web.tsx: spacer rather than an empty Text, so the preview and
          the export agree on both the omission and the meta alignment. */}
      {item.title ? (
        <Text style={styles.itemTitle}>{item.title}</Text>
      ) : (
        <View style={pdfFlexible} />
      )}
      {layout === "gutter" ? (showLinkInHead ? headMeta : null) : headMeta}
    </View>,
  );

  if (subtitleText) {
    rows.push(
      <Text key="subtitle" style={[styles.subtitle, spacing()].flat()}>
        {subtitleText}
      </Text>,
    );
  }

  if (item.summary) {
    rows.push(
      <Text key="summary" style={[styles.body, spacing()].flat()}>
        {item.summary}
      </Text>,
    );
  }

  if (item.bullets.length > 0) {
    rows.push(
      <View key="bullets" style={[styles.bulletList, spacing()].flat()}>
        {item.bullets.map((bullet, index) => (
          <View
            key={`${item.id}-bullet-${index}`}
            style={[
              styles.bulletRow,
              index === 0 ? {} : { marginTop: pxToPt(scale.bulletRowGap) },
            ].flat()}
          >
            <View style={styles.bulletMarkerColumn}>
              <Text style={styles.bulletMarker}>{BULLET_MARKER}</Text>
            </View>
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </View>,
    );
  }

  if (layout === "gutter") {
    return (
      <View style={[styles.itemRow, rootSpacing].flat()} wrap={!keepTogether}>
        <View style={styles.gutter}>
          {item.meta ? <Text style={styles.gutterMeta}>{item.meta}</Text> : null}
        </View>

        <View style={styles.itemBody}>{rows}</View>
      </View>
    );
  }

  return (
    <View style={[styles.itemColumn, rootSpacing].flat()} wrap={!keepTogether}>
      {rows}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Document shell
// ---------------------------------------------------------------------------

/** A section's blocks, and what opens it, which decides whether the opening is held together. */
interface PdfSectionContent {
  nodes: React.ReactNode;
  start: ResumeSectionStart | null;
}

/** See {@link StackedHeaderOptions}. */
export function createStackedPdfHeader({
  geometry,
  ruleWeight = 1,
  ruleColor = "borderColor",
  headlineWeight,
}: StackedHeaderOptions) {
  return function StackedHeader(ctx: ResumePdfContext) {
    const { model, scale, style, styles } = ctx;

    return (
      <View
        style={{
          borderBottomColor: style[ruleColor],
          borderBottomWidth: pxToPt(scale.hairline * ruleWeight),
          marginBottom: pxToPt(geometry.headerGap),
          paddingBottom: pxToPt(geometry.headerPadBottom),
        }}
      >
        {model.showBasics && (
          <>
            <View style={{ flexDirection: "column", rowGap: pxToPt(geometry.nameGapY) }}>
              <Text style={styles.name}>{model.name}</Text>

              {model.headline && (
                <Text
                  style={
                    headlineWeight === undefined
                      ? styles.role
                      : [styles.role, { fontWeight: headlineWeight }]
                  }
                >
                  {model.headline}
                </Text>
              )}
            </View>

            <PdfContactRow ctx={ctx} style={{ marginTop: pxToPt(geometry.contactTop) }} />
          </>
        )}

        <PdfLinkRow ctx={ctx} style={{ marginTop: pxToPt(geometry.linksTop) }} />
      </View>
    );
  };
}

export function createResumePdfTemplate(skin: ResumePdfSkin): React.FC<PdfTemplateProps> {
  const layout = skin.itemLayout ?? "stacked";
  const scale = skin.scale;

  const ResumePdfTemplate: React.FC<PdfTemplateProps> = ({ resume }) => {
    const model = getResumeRenderModel(resume);
    const { style } = model;

    const pagePadding = Math.max(
      RESUME_SPACING_LIMITS.pagePadding.min,
      skin.pagePadding?.(style.pagePadding) ?? style.pagePadding,
    );
    const sectionSpacing = Math.max(
      RESUME_SPACING_LIMITS.sectionSpacing.min,
      skin.sectionSpacing?.(style.sectionSpacing) ?? style.sectionSpacing,
    );

    const styles = createResumePdfStyles(
      style,
      scale,
      pagePadding,
      layout,
      needsLastResortPdfFont({ type: "RESUME", content: resume }),
    );
    const tokens = createResumeTokens(style, scale);
    const ctx: ResumePdfContext = { model, resume, scale, style, styles, tokens };

    // Which blocks stay on one page: the same answer the web template gives the preview.
    const keepTogether = createResumeKeepTogether(ctx, pagePadding, layout);
    const page = getPageGeometry(style.paperSize);

    /**
     * Spacing goes above a section, never below it.
     *
     * A trailing `marginBottom` is invisible — nothing follows the last section
     * — but react-pdf counts it when deciding whether the section fits:
     *
     *     child.box.top + child.box.height + child.box.marginBottom + minPresenceAhead
     *
     * so a section whose *content* ends comfortably inside the text area is
     * pushed to the next page because the empty space after it does not fit,
     * leaving a hole where it used to be. The preview measures the content and
     * keeps it, which is how the two came to disagree by a whole section.
     *
     * This is the rule `Stack` already documents for items: gaps between
     * siblings and nothing at either end.
     */
    const renderSection = (
      key: string,
      title: string,
      { nodes, start }: PdfSectionContent,
      isFirst: boolean,
    ) => {
      const blocks = React.Children.toArray(nodes);
      const heading = skin.renderSectionHeading(title, ctx);

      return (
        <View
          key={key}
          style={{
            ...styles.section,
            backgroundColor: style.sectionBackgroundColor,
            ...(isFirst ? {} : { marginTop: pxToPt(sectionSpacing) }),
          }}
        >
          {/*
            The heading and the first item are one unbreakable block.

            Left apart, react-pdf will break between them: the heading stays at
            the foot of the page with every item overleaf, and because the
            heading is itself wrappable its box gets squeezed into whatever
            space was left — a 14px title rendered in 11px, glyphs spilling out
            of the top. `ResumePagedPreview` never separates the two, so this is
            also what keeps the two paginations agreeing.

            Grouping costs no space: the heading's bottom margin and the second
            item's top margin sit exactly where they did before.
          */}
          {keepTogether.sectionStart(title, start) ? (
            <View style={styles.section} wrap={false}>
              {heading}
              {blocks[0]}
            </View>
          ) : (
            /*
              Too tall to hold together, so it flows — but never leaves the heading at
              the foot of a page. react-pdf honours `minPresenceAhead` only for a node
              with something before it in the same view, hence the empty first child.
              The preview applies the same distance (see `ResumePagedPreview`).
            */
            <View style={styles.section}>
              <View style={{ height: 0 }} />
              {React.isValidElement<{ minPresenceAhead?: number }>(heading)
                ? React.cloneElement(heading, {
                    minPresenceAhead: pxToPt(tokens.body.lineHeight * HEADING_PRESENCE_LINES),
                  })
                : heading}
              {blocks[0]}
            </View>
          )}

          {blocks.slice(1)}
        </View>
      );
    };

    /**
     * Mirrors the web `Stack`: spacing sits between items only, never before
     * the first or after the last one.
     */
    const renderItems = (items: ResumeRenderItem[]): PdfSectionContent => {
      return {
        start: items[0] ? { item: items[0] } : null,
        nodes: items.map((item, index) => (
          <PdfItem
            ctx={ctx}
            item={item}
            keepTogether={keepTogether.item(item)}
            key={item.id}
            layout={layout}
            spacingTop={index === 0 ? 0 : scale.itemGap}
          />
        )),
      };
    };

    return (
      <Document {...getPdfMetadata(model.name, "Resume", resume.language)}>
        <Page size={[page.widthPt, page.heightPt]} style={styles.page}>
          {(model.showBasics || model.showLinks) && skin.renderHeader(ctx)}

          {/*
            Built as a list first, because whether a section is the first one
            rendered — and so whether it takes a top margin — is only known
            after the empty ones have been dropped.
          */}
          {buildResumeSections<PdfSectionContent>(resume, model, {
            items: renderItems,
            summary: (value) => ({
              start: { text: value },
              nodes: <Text style={styles.sectionText}>{value}</Text>,
            }),
            skills: (lines) => ({
              start: lines[0] ? { text: getSkillLineText(lines[0]) } : null,
              nodes: lines.map((line, index) => (
                <Text
                  key={line.id}
                  style={[
                    styles.sectionText,
                    index === 0 ? {} : { marginTop: pxToPt(scale.skillGap) },
                  ].flat()}
                >
                  {line.label ? <Text style={styles.strong}>{line.label}: </Text> : null}
                  {line.value}
                </Text>
              )),
            }),
          }).map((entry, index) =>
            renderSection(entry.id, entry.title, entry.children, index === 0),
          )}
        </Page>
      </Document>
    );
  };

  return ResumePdfTemplate;
}
