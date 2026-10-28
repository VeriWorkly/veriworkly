"use client";

import React from "react";

import type { CSSProperties } from "react";
import type { ResumeData } from "@/types/resume";
import type { TemplateRenderProps } from "@/types/template";
import type {
  ResumeRenderModel,
  ResumeRenderStyle,
} from "@/features/documents/rendering/resume-rendering";
import type { ResumeRenderItem } from "./model";
import type { ResumeTokens } from "./tokens";
import type { ResumeTypeScale } from "./typography";
import type { ResumeSectionStart } from "./keep-together";
import type { StackedHeaderOptions } from "./stacked-header";

import { RESUME_SPACING_LIMITS } from "@/features/resume/constants/resume-layout";
import { getPageGeometry } from "@/templates/shared/page-geometry";
import { FONT_FAMILY_MAP } from "@/features/documents/constants/fonts";
import {
  getLinkDisplayText,
  getResumeRenderModel,
  normalizeLinkHref,
} from "@/features/documents/rendering/resume-rendering";
import { WebSocialIcon } from "@/templates/shared/web-social-icon";
import { buildResumeSections } from "./model";
import { createResumeTokens, webText } from "./tokens";
import { createResumeKeepTogether } from "./keep-together";
import { SPLIT_ATTRIBUTE, TEXT_ITEM_ATTRIBUTE } from "@/templates/shared/pagination";
import { webFixedWidth, webFlexible } from "@/templates/shared/box";
import { BULLET_MARKER } from "./typography";

export interface ResumeWebContext {
  model: ResumeRenderModel;
  resume: ResumeData;
  scale: ResumeTypeScale;
  style: ResumeRenderStyle;
  tokens: ResumeTokens;
}

export interface ResumeWebSkin {
  scale: ResumeTypeScale;
  /** "stacked": title above meta rows. "gutter": dates in a fixed left column. */
  itemLayout?: "stacked" | "gutter";
  /** Scale hooks so a skin can be denser or airier than the user's base setting. */
  pagePadding?: (padding: number) => number;
  sectionSpacing?: (spacing: number) => number;
  renderHeader: (ctx: ResumeWebContext) => React.ReactNode;
  renderSectionHeading: (title: string, ctx: ResumeWebContext) => React.ReactNode;
}

export const px = (value: number) => `${value}px`;

const splitProps = (split: boolean) => (split ? { [SPLIT_ATTRIBUTE]: "" } : {});

/**
 * A column whose children are separated by `gap` — and nothing else. No
 * trailing or leading space, which is what the PDF side reproduces with
 * "margin-top on every child but the first".
 */
function Stack({
  children,
  gap,
  style,
}: {
  children: React.ReactNode;
  gap: number;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: px(gap), ...style }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header building blocks shared by every skin
// ---------------------------------------------------------------------------

const justifyFor = (align: "left" | "center" | "right") =>
  align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

export function WebContactRow({
  align = "left",
  ctx,
  separator = "|",
  style,
}: {
  align?: "left" | "center" | "right";
  ctx: ResumeWebContext;
  separator?: string;
  style?: CSSProperties;
}) {
  const { model, scale, tokens } = ctx;

  if (model.contactItems.length === 0) return null;

  return (
    <div
      style={{
        ...webText(tokens.contact),
        columnGap: px(scale.inlineGapX),
        display: "flex",
        flexWrap: "wrap",
        justifyContent: justifyFor(align),
        rowGap: px(scale.inlineGapY),
        ...style,
      }}
    >
      {model.contactItems.map((item, index) => (
        <React.Fragment key={item.key}>
          {index > 0 && <span aria-hidden="true">{separator}</span>}
          {item.href ? (
            <a href={item.href} style={{ color: "inherit", textDecoration: "none" }}>
              {item.label}
            </a>
          ) : (
            <span>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function WebLinkRow({
  align = "left",
  ctx,
  separator = "|",
  style,
}: {
  align?: "left" | "center" | "right";
  ctx: ResumeWebContext;
  separator?: string;
  style?: CSSProperties;
}) {
  const { model, resume, scale, tokens } = ctx;

  if (!model.showLinks || model.renderedLinks.length === 0) return null;

  const displayMode = resume.links.displayMode;

  return (
    <div
      style={{
        ...webText(tokens.contact),
        columnGap: px(scale.inlineGapX),
        display: "flex",
        flexWrap: "wrap",
        justifyContent: justifyFor(align),
        rowGap: px(scale.inlineGapY),
        ...style,
      }}
    >
      {model.renderedLinks.map((link, index) => (
        <React.Fragment key={link.id || index}>
          {index > 0 && <span aria-hidden="true">{separator}</span>}
          <a
            href={normalizeLinkHref(link.url)}
            rel="noopener noreferrer"
            style={{
              alignItems: "center",
              color: "inherit",
              columnGap: px(scale.iconGap),
              display: "inline-flex",
              textDecoration: "none",
            }}
            target="_blank"
          >
            {displayMode !== "url" && (
              <WebSocialIcon
                color={ctx.style.mutedTextColor}
                size={scale.contact}
                type={link.type}
              />
            )}
            {displayMode !== "icon" && <span>{getLinkDisplayText(link, displayMode)}</span>}
          </a>
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item rendering
// ---------------------------------------------------------------------------

/**
 * Bullets are explicit marker + text rows rather than a `<ul>`: browser list
 * markers are positioned by the UA (and differ between them), so a real glyph
 * from the same font is the only way to match the PDF exactly.
 */
function WebBullets({ bullets, ctx }: { bullets: string[]; ctx: ResumeWebContext }) {
  const { scale, tokens } = ctx;

  return (
    <div>
      {bullets.map((bullet, index) => (
        <div
          key={index}
          style={{
            columnGap: px(scale.bulletGap),
            display: "flex",
            marginTop: index === 0 ? 0 : px(scale.bulletRowGap),
          }}
        >
          <span
            aria-hidden="true"
            style={{
              ...webText(tokens.body),
              ...webFixedWidth(scale.bulletIndent - scale.bulletGap),
              textAlign: "right",
            }}
          >
            {BULLET_MARKER}
          </span>

          <span style={{ ...webText(tokens.body), ...webFlexible }}>{bullet}</span>
        </div>
      ))}
    </div>
  );
}

function WebItem({
  ctx,
  item,
  layout,
  split,
}: {
  ctx: ResumeWebContext;
  item: ResumeRenderItem;
  layout: "stacked" | "gutter";
  split: boolean;
}) {
  const { scale, tokens } = ctx;

  const showLinkInHead = !item.meta && Boolean(item.link);
  const subtitleText = [item.subtitle, !showLinkInHead && item.link ? item.link.text : ""]
    .filter(Boolean)
    .join(" | ");

  const headMeta = showLinkInHead ? (
    <a
      href={item.link?.href}
      rel="noopener noreferrer"
      style={{
        ...webText(tokens.headMeta),
        flexGrow: 0,
        flexShrink: 1,
        minWidth: 0,
        textDecoration: "none",
      }}
      target="_blank"
    >
      {item.link?.text}
    </a>
  ) : item.meta ? (
    <p style={{ ...webText(tokens.headMeta), flexGrow: 0, flexShrink: 1, minWidth: 0 }}>
      {item.meta}
    </p>
  ) : null;

  const rows: React.ReactNode[] = [];

  rows.push(
    <div
      key="head"
      style={{
        alignItems: "flex-start",
        columnGap: px(scale.headGap),
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      {/*
        An untitled entry renders a flexible spacer instead of an empty heading: the
        heading would still occupy a line box, and dropping it outright would let
        `space-between` pull the date meta to the left edge.
      */}
      {item.title ? (
        <h3 style={{ ...webText(tokens.itemTitle), ...webFlexible }}>{item.title}</h3>
      ) : (
        <div style={webFlexible} />
      )}
      {layout === "gutter" ? (showLinkInHead ? headMeta : null) : headMeta}
    </div>,
  );

  if (subtitleText) {
    rows.push(
      <p key="subtitle" style={webText(tokens.subtitle)}>
        {subtitleText}
      </p>,
    );
  }

  if (item.summary) {
    rows.push(
      <p key="summary" style={webText(tokens.body)}>
        {item.summary}
      </p>,
    );
  }

  if (item.bullets.length > 0) {
    rows.push(<WebBullets bullets={item.bullets} ctx={ctx} key="bullets" />);
  }

  if (layout === "gutter") {
    return (
      <article
        className="break-inside-avoid"
        style={{ columnGap: px(scale.gutterGap), display: "flex" }}
        {...splitProps(split)}
      >
        <div style={webFixedWidth(scale.gutterWidth)}>
          {item.meta ? <p style={webText(ctx.tokens.gutterMeta)}>{item.meta}</p> : null}
        </div>

        <Stack gap={scale.itemRowGap} style={webFlexible}>
          {rows}
        </Stack>
      </article>
    );
  }

  return (
    <article
      className="break-inside-avoid"
      style={{ display: "flex", flexDirection: "column", gap: px(scale.itemRowGap) }}
      {...splitProps(split)}
    >
      {rows}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Document shell
// ---------------------------------------------------------------------------

/**
 * DOM contract: `#resume-container` must only contain `<header>`/`<section>`
 * children, and every `<section>` must be exactly `[heading, itemsContainer]`.
 * `ResumePagedPreview` relies on that shape to split content across pages.
 */
function WebSection({
  children,
  ctx,
  gap,
  heading,
  isFirst,
  spacing,
  split,
}: {
  children: React.ReactNode;
  ctx: ResumeWebContext;
  gap: number;
  heading: React.ReactNode;
  isFirst: boolean;
  spacing: number;
  split: boolean;
}) {
  return (
    <section
      className="break-inside-avoid-page"
      style={{
        backgroundColor: ctx.style.sectionBackgroundColor,
        // Above, never below — see `buildResumeSections`. A trailing margin is
        // invisible here but pushes a whole section onto the next page in the
        // export, which is how the preview and the PDF came to disagree.
        ...(isFirst ? {} : { marginTop: px(spacing) }),
      }}
      {...splitProps(split)}
    >
      {heading}
      <Stack gap={gap}>{children}</Stack>
    </section>
  );
}

/** See {@link StackedHeaderOptions}. */
export function createStackedWebHeader({
  geometry,
  ruleWeight = 1,
  ruleColor = "borderColor",
  headlineWeight,
}: StackedHeaderOptions) {
  return function StackedHeader(ctx: ResumeWebContext) {
    const { model, scale, style, tokens } = ctx;

    return (
      <header
        style={{
          borderBottom: `${scale.hairline * ruleWeight}px solid ${style[ruleColor]}`,
          display: "flex",
          flexDirection: "column",
          marginBottom: px(geometry.headerGap),
          paddingBottom: px(geometry.headerPadBottom),
        }}
      >
        {model.showBasics && (
          <>
            <div
              style={{ display: "flex", flexDirection: "column", rowGap: px(geometry.nameGapY) }}
            >
              <h1 style={webText(tokens.name)}>{model.name}</h1>

              {model.headline && (
                <p
                  style={
                    headlineWeight === undefined
                      ? webText(tokens.role)
                      : { ...webText(tokens.role), fontWeight: headlineWeight }
                  }
                >
                  {model.headline}
                </p>
              )}
            </div>

            <WebContactRow ctx={ctx} style={{ marginTop: px(geometry.contactTop) }} />
          </>
        )}

        <WebLinkRow ctx={ctx} style={{ marginTop: px(geometry.linksTop) }} />
      </header>
    );
  };
}

export function createResumeWebTemplate(skin: ResumeWebSkin): React.FC<TemplateRenderProps> {
  const layout = skin.itemLayout ?? "stacked";
  const scale = skin.scale;

  const ResumeWebTemplate: React.FC<TemplateRenderProps> = ({ resume }) => {
    if (!resume) return null;

    const model = getResumeRenderModel(resume);
    const { style } = model;
    const tokens = createResumeTokens(style, scale);
    const ctx: ResumeWebContext = { model, resume, scale, style, tokens };

    const pagePadding = Math.max(
      RESUME_SPACING_LIMITS.pagePadding.min,
      skin.pagePadding?.(style.pagePadding) ?? style.pagePadding,
    );
    const sectionSpacing = Math.max(
      RESUME_SPACING_LIMITS.sectionSpacing.min,
      skin.sectionSpacing?.(style.sectionSpacing) ?? style.sectionSpacing,
    );

    const keepTogether = createResumeKeepTogether(ctx, pagePadding, layout);
    const page = getPageGeometry(style.paperSize);

    const renderItems = (items: ResumeRenderItem[]) =>
      items.map((item) => (
        <WebItem
          ctx={ctx}
          item={item}
          key={item.id}
          layout={layout}
          split={!keepTogether.item(item)}
        />
      ));

    /** Sections carry their own inner gap: skill lines sit tighter than items. */
    const sections = buildResumeSections<{
      nodes: React.ReactNode;
      gap: number;
      start: ResumeSectionStart | null;
    }>(resume, model, {
      items: (items) => ({
        nodes: renderItems(items),
        gap: scale.itemGap,
        start: items[0] ? { item: items[0] } : null,
      }),
      summary: (value) => ({
        nodes: <p style={webText(tokens.body)}>{value}</p>,
        gap: scale.itemGap,
        start: { text: value },
      }),
      skills: (lines) => ({
        start: lines[0] ? { text: `${lines[0].label}: ${lines[0].value}` } : null,
        nodes: lines.map((line) => (
          <article className="break-inside-avoid" key={line.id} {...{ [TEXT_ITEM_ATTRIBUTE]: "" }}>
            <p style={webText(tokens.body)}>
              <span style={{ fontWeight: 700 }}>{line.label}: </span>
              {line.value}
            </p>
          </article>
        )),
        gap: scale.skillGap,
      }),
    });

    return (
      <div
        className="resume-page-preview mx-auto"
        id="resume-container"
        style={
          {
            "--resume-page-height": px(page.heightPx),
            "--resume-page-margin": px(pagePadding),
            backgroundColor: style.pageBackgroundColor,
            color: style.textColor,
            fontFamily: FONT_FAMILY_MAP[style.fontFamily],
            fontSize: px(scale.body),
            lineHeight: px(scale.body * style.bodyLineHeight),
            minHeight: px(page.heightPx),
            padding: px(pagePadding),
            width: px(page.widthPx),
          } as React.CSSProperties
        }
      >
        {(model.showBasics || model.showLinks) && skin.renderHeader(ctx)}

        {sections.map((section, index) => (
          <WebSection
            ctx={ctx}
            gap={section.children.gap}
            heading={skin.renderSectionHeading(section.title, ctx)}
            isFirst={index === 0}
            key={section.id}
            spacing={sectionSpacing}
            split={!keepTogether.sectionStart(section.title, section.children.start)}
          >
            {section.children.nodes}
          </WebSection>
        ))}
      </div>
    );
  };

  return ResumeWebTemplate;
}
