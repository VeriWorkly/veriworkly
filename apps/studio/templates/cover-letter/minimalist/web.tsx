/* eslint-disable @next/next/no-img-element */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { CSSProperties } from "react";
import type { CoverLetterContent } from "@/features/cover-letter/types";
import type { ResumeLinkDisplayMode, ResumeLinkItem } from "@/types/resume";
import type { CoverLetterTokens } from "../tokens";

import { createCoverLetterPageProbe } from "../measure";
import { paginateIncremental } from "@/templates/shared/pagination";

import {
  buildCoverLetterFlowContent,
  buildProfessionalFlowItems,
  getCoverLetterState,
  getFlowPageKey,
  getProfessionalFlowItemWeight,
  getCoverLetterFlowSenderName,
  isCoverLetterSectionVisible,
  paginateWeightedItems,
  type CoverLetterPalette,
  type ProfessionalFlowItem,
} from "../shared";

import {
  normalizeLinkHref,
  getLinkDisplayText,
} from "@/features/documents/rendering/resume-rendering";
import { FONT_FAMILY_MAP, getFontStylesheetHref } from "@/features/documents/constants/fonts";
import { escapeHtml } from "@/features/resume/services/resume-formatters";
import { webFixedWidth, webFlexible } from "@/templates/shared/box";
import { webText } from "@/templates/shared/text-tokens";
import { COVER_LETTER_SCALE as S } from "../tokens";

import { SOCIAL_ICON_SRC_BY_TYPE } from "@/templates/shared/social-icons";

const PAGE_HEIGHT = S.pageHeight;

const px = (value: number) => `${value}px`;

/** En dash keeps the quiet, type-led character of this template; still plain text for ATS. */
const MINIMAL_MARKER = "–";

/**
 * Same single-column body flow and pagination engine as `../professional`,
 * styled without rules or shaded fills. The page box and token line boxes are
 * untouched; the masthead below is the one deliberately different part — see
 * `LetterHead`.
 */
function renderFlowItem(
  item: ProfessionalFlowItem,
  palette: CoverLetterPalette,
  tokens: CoverLetterTokens,
  paragraphSpacing: number,
) {
  const spacing = { marginBottom: px(paragraphSpacing) };

  if (item.type === "greeting")
    return <p style={{ ...webText(tokens.strong), ...spacing }}>{item.text}</p>;

  if (item.type === "paragraph" || item.type === "closing")
    return <p style={{ ...webText(tokens.body), ...spacing }}>{item.text}</p>;

  if (item.type === "body-list" || item.type === "proof-list")
    return (
      <div
        style={{
          borderLeft: `2px solid ${palette.accent}`,
          padding: `${px(S.listPadY)} ${px(S.listPadX)}`,
          ...spacing,
        }}
      >
        {item.items.map((listItem, index) => (
          <div
            key={listItem}
            style={{
              columnGap: px(S.bulletGap),
              display: "flex",
              marginTop: index === 0 ? 0 : px(S.bulletRowGap),
            }}
          >
            <span
              aria-hidden="true"
              style={{
                ...webText(tokens.body),
                color: palette.soft,
                ...webFixedWidth(S.bulletIndent - S.bulletGap),
                textAlign: "right",
              }}
            >
              {MINIMAL_MARKER}
            </span>

            <span style={{ ...webText(tokens.body), ...webFlexible }}>{listItem}</span>
          </div>
        ))}
      </div>
    );

  if (item.type === "signature") return <p style={webText(tokens.strong)}>{item.text}</p>;

  return (
    <p
      style={{
        ...webText(tokens.postscript),
        borderTop: `${S.hairline}px solid transparent`,
        marginTop: px(S.postscriptTop),
        paddingTop: px(S.postscriptPadTop),
      }}
    >
      P.S. {item.text}
    </p>
  );
}

function renderGroupedFlowItems(
  items: ProfessionalFlowItem[],
  palette: CoverLetterPalette,
  tokens: CoverLetterTokens,
  paragraphSpacing: number,
) {
  return items.map((item) => (
    <div key={item.id}>{renderFlowItem(item, palette, tokens, paragraphSpacing)}</div>
  ));
}

/**
 * Full-width, stacked masthead — the structural mark that sets Minimalist
 * apart from every side-by-side header in the set. Contact details run as one
 * wrapped inline row under the title instead of a fixed right column, so nothing
 * on the page competes with the name for a first look.
 */
function LetterHead({
  contact,
  linkDisplayMode,
  palette,
  renderedLinks,
  senderName,
  senderTitle,
  tokens,
}: {
  contact: string[];
  linkDisplayMode: ResumeLinkDisplayMode;
  palette: CoverLetterPalette;
  renderedLinks: ResumeLinkItem[];
  senderName: string;
  senderTitle: string;
  tokens: CoverLetterTokens;
}) {
  return (
    <header
      style={{
        borderBottom: `${S.headerRule}px solid transparent`,
        paddingBottom: px(S.headerPadBottom),
      }}
    >
      <p style={{ ...webText(tokens.label), marginBottom: px(6) }}>Cover Letter</p>
      <h1 style={{ ...webText(tokens.senderName), fontWeight: 600 }}>{senderName}</h1>
      <p style={{ ...webText(tokens.senderTitle), marginTop: px(S.subjectLabelGap) }}>
        {senderTitle}
      </p>

      {contact.length > 0 ? (
        <div
          style={{
            columnGap: px(10),
            display: "flex",
            flexWrap: "wrap",
            marginTop: px(S.headerRowGap * 2),
            rowGap: px(4),
          }}
        >
          {contact.map((item, index) => (
            <span key={item} style={{ alignItems: "center", columnGap: px(10), display: "flex" }}>
              <span style={webText(tokens.contact)}>{item}</span>
              {index < contact.length - 1 && (
                <span style={{ ...webText(tokens.contact), color: palette.soft }}>·</span>
              )}
            </span>
          ))}
        </div>
      ) : null}

      {renderedLinks.length > 0 ? (
        <div
          style={{
            columnGap: px(16),
            display: "flex",
            flexWrap: "wrap",
            marginTop: px(6),
            rowGap: px(4),
          }}
        >
          {renderedLinks.map((link) => (
            <a
              key={link.id}
              href={normalizeLinkHref(link.url)}
              style={{
                ...webText(tokens.contact),
                alignItems: "center",
                color: palette.strong,
                columnGap: "4px",
                display: "flex",
                textDecoration: "none",
              }}
            >
              {linkDisplayMode !== "url" && (
                <img
                  alt=""
                  aria-hidden="true"
                  src={SOCIAL_ICON_SRC_BY_TYPE[link.type] || SOCIAL_ICON_SRC_BY_TYPE.custom}
                  style={{
                    display: "block",
                    ...webFixedWidth(S.contact),
                    height: px(S.contact),
                  }}
                />
              )}

              {linkDisplayMode !== "icon" && (
                <span>{getLinkDisplayText(link, linkDisplayMode)}</span>
              )}
            </a>
          ))}
        </div>
      ) : null}
    </header>
  );
}

/**
 * Date first, then the inside address — a top-down reading order rather than
 * Professional's left/right split, so the page never asks the eye to jump
 * sideways before the letter has even started.
 */
function RecipientMeta({
  date,
  recipient,
  tokens,
}: {
  date: string;
  recipient: string[];
  tokens: CoverLetterTokens;
}) {
  return (
    <section style={{ marginTop: px(S.metaTop) }}>
      {date ? <p style={webText(tokens.metaDate)}>{date}</p> : null}

      {recipient.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: date ? px(S.metaRowGap * 2) : 0,
            rowGap: px(S.metaRowGap),
          }}
        >
          {recipient.map((line) => (
            <p key={line} style={webText(tokens.contact)}>
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SubjectBlock({
  subject,
  tokens,
}: {
  palette: CoverLetterPalette;
  subject: string;
  tokens: CoverLetterTokens;
}) {
  return (
    <section
      style={{
        marginTop: px(S.subjectTop),
        paddingBottom: px(S.subjectPadY),
        paddingTop: px(S.subjectPadY),
      }}
    >
      <p style={webText(tokens.label)}>Re</p>
      <h2 style={{ ...webText(tokens.subject), fontWeight: 600, marginTop: px(S.subjectLabelGap) }}>
        {subject}
      </h2>
    </section>
  );
}

function paginateMinimalistHtmlItems(items: ProfessionalFlowItem[]) {
  return paginateWeightedItems(items, getProfessionalFlowItemWeight, (pageIndex) =>
    pageIndex === 0 ? 17 : 26,
  );
}

function renderMinimalistHtmlItem(item: ProfessionalFlowItem) {
  if (item.type === "greeting") return `<p class="greeting">${escapeHtml(item.text)}</p>`;
  if (item.type === "paragraph") return `<p>${escapeHtml(item.text)}</p>`;
  if (item.type === "body-list" || item.type === "proof-list") {
    return `<div class="list">${item.items
      .map(
        (listItem) =>
          `<div class="bullet"><span class="marker">${MINIMAL_MARKER}</span><span>${escapeHtml(listItem)}</span></div>`,
      )
      .join("")}</div>`;
  }
  if (item.type === "closing") return `<p>${escapeHtml(item.text)}</p>`;
  if (item.type === "signature") return `<p class="signature">${escapeHtml(item.text)}</p>`;

  return `<p class="postscript">P.S. ${escapeHtml(item.text)}</p>`;
}

export function MinimalistCoverLetterPreview({ content }: { content: CoverLetterContent }) {
  const state = getCoverLetterState(content, { firstPage: 18, nextPage: 27 });
  const {
    appearance,
    palette,
    tokens,
    senderName,
    senderTitle,
    contact,
    linkDisplayMode,
    renderedLinks,
    recipient,
  } = state;
  const fontFamily = FONT_FAMILY_MAP[appearance.fontFamily];
  const flowSenderName = getCoverLetterFlowSenderName(content);
  const showTarget = isCoverLetterSectionVisible(content, "target");
  const subject = content.subject || content.jobTitle;
  const flowContent = useMemo(() => buildCoverLetterFlowContent(content), [content]);
  const flowItems = useMemo(
    () => buildProfessionalFlowItems(flowContent, flowSenderName),
    [flowContent, flowSenderName],
  );
  const [pages, setPages] = useState<ProfessionalFlowItem[][]>(() => [flowItems]);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const firstPrefixRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const [fontsReady, setFontsReady] = useState(() => typeof document === "undefined");

  useEffect(() => {
    if (fontsReady) return;

    let cancelled = false;

    document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [fontsReady]);

  const pageStyle: CSSProperties = {
    backgroundColor: appearance.pageColor,
    color: palette.text,
    fontFamily,
    padding: px(appearance.pageMargin),
  };

  const pageBox: CSSProperties = { height: px(S.pageHeight), width: px(S.pageWidth) };

  const bodyStyle: CSSProperties = { marginTop: px(S.bodyTop) };

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const probe = document.createElement("article");

      probe.className = "mx-auto max-w-full overflow-hidden";
      probe.style.height = px(S.pageHeight);
      probe.style.width = px(S.pageWidth);
      Object.assign(probe.style, {
        backgroundColor: appearance.pageColor,
        color: palette.text,
        fontFamily,
        padding: px(appearance.pageMargin),
      });
      measureRef.current?.appendChild(probe);

      const nextPages = paginateIncremental(
        flowItems,
        createCoverLetterPageProbe<ProfessionalFlowItem>({
          measureRoot: probe,
          contentRoot: probe,
          pageHeight: PAGE_HEIGHT,
          getPrefix: (pageIndex) => (pageIndex === 0 ? firstPrefixRef.current : null),
          getItemNode: (item) => itemRefs.current.get(item.id) ?? null,
          createBody: () => {
            const main = document.createElement("main");
            main.style.marginTop = px(S.bodyTop);
            return main;
          },
        }),
      );
      probe.remove();
      const nextKey = getFlowPageKey(nextPages);

      setPages((current) => {
        const currentKey = getFlowPageKey(current);
        return currentKey === nextKey ? current : nextPages;
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    appearance.pageColor,
    appearance.pageMargin,
    flowItems,
    fontFamily,
    fontsReady,
    palette.text,
  ]);

  const head = (
    <LetterHead
      contact={contact}
      linkDisplayMode={linkDisplayMode}
      palette={palette}
      renderedLinks={renderedLinks}
      senderName={senderName}
      senderTitle={senderTitle}
      tokens={tokens}
    />
  );

  return (
    <div className="grid gap-6">
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none absolute opacity-0"
        style={{ left: -10000, top: 0, width: 794 }}
      >
        <article className="overflow-hidden" style={{ ...pageStyle, ...pageBox }}>
          <div ref={firstPrefixRef}>
            {head}
            <RecipientMeta date={content.date} recipient={recipient} tokens={tokens} />
            {showTarget && subject ? (
              <SubjectBlock palette={palette} subject={subject} tokens={tokens} />
            ) : null}
          </div>

          <main style={bodyStyle}>
            {flowItems.map((item) => (
              <div
                key={item.id}
                ref={(node) => {
                  if (node) itemRefs.current.set(item.id, node);
                  else itemRefs.current.delete(item.id);
                }}
              >
                {renderFlowItem(item, palette, tokens, appearance.paragraphSpacing)}
              </div>
            ))}
          </main>
        </article>
      </div>

      {pages.map((pageBlocks, pageIndex) => (
        <article
          key={pageIndex}
          className="mx-auto max-w-full overflow-hidden shadow-sm ring-1 ring-zinc-200"
          style={{ ...pageStyle, ...pageBox }}
        >
          {pageIndex === 0 ? (
            <>
              {head}
              <RecipientMeta date={content.date} recipient={recipient} tokens={tokens} />
              {showTarget && subject ? (
                <SubjectBlock palette={palette} subject={subject} tokens={tokens} />
              ) : null}
            </>
          ) : null}

          <main style={bodyStyle}>
            {renderGroupedFlowItems(pageBlocks, palette, tokens, appearance.paragraphSpacing)}
          </main>
        </article>
      ))}
    </div>
  );
}

export function buildMinimalistCoverLetterHtml(content: CoverLetterContent): string {
  const state = getCoverLetterState(content, { firstPage: 18, nextPage: 27 });

  const {
    appearance,
    palette,
    tokens,
    senderName,
    senderTitle,
    contact,
    linkDisplayMode,
    renderedLinks,
    recipient,
  } = state;
  const showTarget = isCoverLetterSectionVisible(content, "target");
  const subject = escapeHtml(
    showTarget ? content.subject || content.jobTitle || "Application" : "",
  );
  const fontFamily = FONT_FAMILY_MAP[appearance.fontFamily];
  const fontHref = getFontStylesheetHref(appearance.fontFamily);
  const flowItems = buildProfessionalFlowItems(buildCoverLetterFlowContent(content), senderName);
  const pages = paginateMinimalistHtmlItems(flowItems);

  const t = tokens;
  const font = (token: (typeof t)["body"]) =>
    `font-size:${token.fontSize}px;line-height:${token.lineHeight}px;font-weight:${token.fontWeight};color:${token.color};`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(content.senderName || "Cover Letter")}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${escapeHtml(fontHref)}"><style>
*{box-sizing:border-box}body{margin:0;padding:32px 16px;background:${palette.surface};color:${palette.text};font-family:${fontFamily}}.page{width:794px;height:1123px;margin:0 auto 24px;overflow:hidden;background:${appearance.pageColor};box-shadow:0 0 0 1px ${palette.border};page-break-after:always;padding:${appearance.pageMargin}px}.page:last-child{page-break-after:auto}p,h1,h2{margin:0}header{border-bottom:${S.headerRule}px solid transparent;padding-bottom:${S.headerPadBottom}px}header h1{${font(t.senderName)}font-weight:600}header .title{${font(t.senderTitle)}margin-top:${S.subjectLabelGap}px}.contact-row{display:flex;flex-wrap:wrap;column-gap:10px;row-gap:4px;margin-top:${S.headerRowGap * 2}px}.contact-row .item{display:flex;align-items:center;column-gap:10px}.contact-row .item span{${font(t.contact)}}.contact-row .sep{color:${palette.soft}}.links-row{display:flex;flex-wrap:wrap;column-gap:16px;row-gap:4px;margin-top:6px}.links-row a{${font({ ...t.contact, color: palette.strong })}text-decoration:none;display:flex;align-items:center;column-gap:4px}.meta{margin-top:${S.metaTop}px}.meta .date{${font(t.metaDate)}}.meta .to{display:flex;flex-direction:column;row-gap:${S.metaRowGap}px;margin-top:${S.metaRowGap * 2}px}.meta .to p{${font(t.contact)}}.subject{margin-top:${S.subjectTop}px;padding:${S.subjectPadY}px 0}.label{${font(t.label)}letter-spacing:${t.label.letterSpacing}px;text-transform:uppercase;margin-bottom:6px}.subject h2{${font(t.subject)}font-weight:600;margin-top:${S.subjectLabelGap}px}.body{margin-top:${S.bodyTop}px}.body p{${font(t.body)}margin-bottom:${appearance.paragraphSpacing}px}.greeting,.signature{${font(t.strong)}}.list{border-left:2px solid ${palette.accent};padding:${S.listPadY}px ${S.listPadX}px;margin-bottom:${appearance.paragraphSpacing}px}.bullet{display:flex;column-gap:${S.bulletGap}px}.bullet+.bullet{margin-top:${S.bulletRowGap}px}.bullet .marker{flex:0 0 ${S.bulletIndent - S.bulletGap}px;width:${S.bulletIndent - S.bulletGap}px;text-align:right;color:${palette.soft}}.bullet span{${font(t.body)}}.postscript{${font(t.postscript)}border-top:${S.hairline}px solid transparent;margin-top:${S.postscriptTop}px;padding-top:${S.postscriptPadTop}px}.continued{${font(t.continued)}letter-spacing:${t.continued.letterSpacing}px;text-transform:uppercase;padding-bottom:${S.continuedPadBottom}px}@media print{body{padding:0;background:white}.page{box-shadow:none;margin:0}}</style></head><body>${pages
    .map((blocks, pageIndex) => {
      const first = pageIndex === 0;
      const body = blocks.map((item) => renderMinimalistHtmlItem(item)).join("");
      const contactRow =
        contact.length > 0
          ? `<div class="contact-row">${contact
              .map(
                (item, index) =>
                  `<span class="item"><span>${escapeHtml(item)}</span>${
                    index < contact.length - 1 ? '<span class="sep">&middot;</span>' : ""
                  }</span>`,
              )
              .join("")}</div>`
          : "";
      const linksRow =
        renderedLinks.length > 0
          ? `<div class="links-row">${renderedLinks
              .map(
                (link) =>
                  `<a href="${escapeHtml(normalizeLinkHref(link.url))}">${escapeHtml(getLinkDisplayText(link, linkDisplayMode))}</a>`,
              )
              .join("")}</div>`
          : "";
      const metaBlock = `<section class="meta">${content.date ? `<p class="date">${escapeHtml(content.date)}</p>` : ""}${
        recipient.length > 0
          ? `<div class="to">${recipient.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>`
          : ""
      }</section>`;

      return `<article class="page">${
        first
          ? `<header><p class="label">Cover Letter</p><h1>${escapeHtml(senderName)}</h1><p class="title">${escapeHtml(senderTitle)}</p>${contactRow}${linksRow}</header>${metaBlock}${
              showTarget
                ? `<section class="subject"><p class="label">Re</p><h2>${subject}</h2></section>`
                : ""
            }`
          : ""
      }<main class="body">${body}</main></article>`;
    })
    .join("")}</body></html>`;
}
