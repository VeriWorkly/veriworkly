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

/** Em dash suits the letter's more formal register; still plain text for ATS. */
const EXECUTIVE_MARKER = "—";

/**
 * Same single-column body flow and pagination engine as `../professional`.
 * The distinguishing marks are a double-rule masthead with a centered
 * identity block (still keeping the fixed contact column) and a traditional
 * dateline-over-address `RecipientMeta`, in place of the side-by-side split
 * every other template shares.
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
          borderBottom: `${S.hairline}px solid ${palette.border}`,
          borderTop: `${S.hairline}px solid ${palette.border}`,
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
                color: palette.accent,
                ...webFixedWidth(S.bulletIndent - S.bulletGap),
                textAlign: "right",
              }}
            >
              {EXECUTIVE_MARKER}
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
        borderTop: `${S.hairline}px solid ${palette.border}`,
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
        borderBottom: `${S.hairline}px solid ${palette.strong}`,
        borderTop: `${S.hairline}px solid ${palette.strong}`,
        display: "flex",
        paddingBottom: px(S.headerPadBottom),
        paddingTop: px(S.subjectLabelGap),
      }}
    >
      <div style={{ ...webFlexible, textAlign: "center" }}>
        <h1 style={{ ...webText(tokens.senderName), letterSpacing: 0.4 }}>{senderName}</h1>
        <p
          style={{
            ...webText(tokens.senderTitle),
            marginTop: px(S.subjectLabelGap),
            textTransform: "uppercase",
          }}
        >
          {senderTitle}
        </p>
      </div>

      {contact.length > 0 || renderedLinks.length > 0 ? (
        <div
          style={{
            alignItems: "flex-end",
            display: "flex",
            flexDirection: "column",
            ...webFixedWidth(S.headerContactWidth),
            marginLeft: px(S.headerColumnGap),
            rowGap: px(S.headerRowGap),
          }}
        >
          {contact.map((item) => (
            <p key={item} style={webText(tokens.contact)}>
              {item}
            </p>
          ))}

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
 * A centered dateline above a left-aligned inside address — the composition a
 * formal business letter actually uses, in place of the side-by-side split
 * every other template in the set shares.
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
      {date ? <p style={{ ...webText(tokens.metaDate), textAlign: "center" }}>{date}</p> : null}

      {recipient.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: date ? px(S.metaRowGap * 3) : 0,
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
  palette,
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
        borderBottom: `${S.hairline}px solid ${palette.border}`,
        marginTop: px(S.subjectTop),
        paddingBottom: px(S.subjectPadY),
      }}
    >
      <p style={{ ...webText(tokens.label), letterSpacing: (tokens.label.letterSpacing ?? 0) + 1 }}>
        Re
      </p>
      <h2 style={{ ...webText(tokens.subject), marginTop: px(S.subjectLabelGap) }}>{subject}</h2>
    </section>
  );
}

function paginateExecutiveHtmlItems(items: ProfessionalFlowItem[]) {
  return paginateWeightedItems(items, getProfessionalFlowItemWeight, (pageIndex) =>
    pageIndex === 0 ? 17 : 26,
  );
}

function renderExecutiveHtmlItem(item: ProfessionalFlowItem) {
  if (item.type === "greeting") return `<p class="greeting">${escapeHtml(item.text)}</p>`;
  if (item.type === "paragraph") return `<p>${escapeHtml(item.text)}</p>`;
  if (item.type === "body-list" || item.type === "proof-list") {
    return `<div class="list">${item.items
      .map(
        (listItem) =>
          `<div class="bullet"><span class="marker">${EXECUTIVE_MARKER}</span><span>${escapeHtml(listItem)}</span></div>`,
      )
      .join("")}</div>`;
  }
  if (item.type === "closing") return `<p>${escapeHtml(item.text)}</p>`;
  if (item.type === "signature") return `<p class="signature">${escapeHtml(item.text)}</p>`;

  return `<p class="postscript">P.S. ${escapeHtml(item.text)}</p>`;
}

export function ExecutiveCoverLetterPreview({ content }: { content: CoverLetterContent }) {
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

export function buildExecutiveCoverLetterHtml(content: CoverLetterContent): string {
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
  const pages = paginateExecutiveHtmlItems(flowItems);

  const t = tokens;
  const font = (token: (typeof t)["body"]) =>
    `font-size:${token.fontSize}px;line-height:${token.lineHeight}px;font-weight:${token.fontWeight};color:${token.color};`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(content.senderName || "Cover Letter")}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${escapeHtml(fontHref)}"><style>
*{box-sizing:border-box}body{margin:0;padding:32px 16px;background:${palette.surface};color:${palette.text};font-family:${fontFamily}}.page{width:794px;height:1123px;margin:0 auto 24px;overflow:hidden;background:${appearance.pageColor};box-shadow:0 0 0 1px ${palette.border};page-break-after:always;padding:${appearance.pageMargin}px}.page:last-child{page-break-after:auto}p,h1,h2{margin:0}header{display:flex;border-top:${S.hairline}px solid ${palette.strong};border-bottom:${S.hairline}px solid ${palette.strong};padding-top:${S.subjectLabelGap}px;padding-bottom:${S.headerPadBottom}px}header .identity{flex:1 1 auto;min-width:0;text-align:center}header h1{${font(t.senderName)}letter-spacing:0.4px}header .identity p{${font(t.senderTitle)}margin-top:${S.subjectLabelGap}px;text-transform:uppercase}.contact{display:flex;flex-direction:column;align-items:flex-end;flex:0 0 ${S.headerContactWidth}px;width:${S.headerContactWidth}px;margin-left:${S.headerColumnGap}px;row-gap:${S.headerRowGap}px}.contact p{${font(t.contact)}}.contact a{${font({ ...t.contact, color: palette.strong })}text-decoration:none}.meta{margin-top:${S.metaTop}px}.meta .date{${font(t.metaDate)}text-align:center}.meta .to{display:flex;flex-direction:column;row-gap:${S.metaRowGap}px;margin-top:${S.metaRowGap * 3}px}.meta .to p{${font(t.contact)}}.subject{border-bottom:${S.hairline}px solid ${palette.border};margin-top:${S.subjectTop}px;padding-bottom:${S.subjectPadY}px}.label{${font(t.label)}letter-spacing:${(t.label.letterSpacing ?? 0) + 1}px;text-transform:uppercase}.subject h2{${font(t.subject)}margin-top:${S.subjectLabelGap}px}.body{margin-top:${S.bodyTop}px}.body p{${font(t.body)}margin-bottom:${appearance.paragraphSpacing}px}.greeting,.signature{${font(t.strong)}}.list{border-top:${S.hairline}px solid ${palette.border};border-bottom:${S.hairline}px solid ${palette.border};padding:${S.listPadY}px ${S.listPadX}px;margin-bottom:${appearance.paragraphSpacing}px}.bullet{display:flex;column-gap:${S.bulletGap}px}.bullet+.bullet{margin-top:${S.bulletRowGap}px}.bullet .marker{flex:0 0 ${S.bulletIndent - S.bulletGap}px;width:${S.bulletIndent - S.bulletGap}px;text-align:right;color:${palette.accent}}.bullet span{${font(t.body)}}.postscript{${font(t.postscript)}border-top:${S.hairline}px solid ${palette.border};margin-top:${S.postscriptTop}px;padding-top:${S.postscriptPadTop}px}.continued{${font(t.continued)}letter-spacing:${t.continued.letterSpacing}px;text-transform:uppercase;border-bottom:${S.hairline}px solid ${palette.border};padding-bottom:${S.continuedPadBottom}px}@media print{body{padding:0;background:white}.page{box-shadow:none;margin:0}}</style></head><body>${pages
    .map((blocks, pageIndex) => {
      const first = pageIndex === 0;
      const body = blocks.map((item) => renderExecutiveHtmlItem(item)).join("");
      return `<article class="page">${
        first
          ? `<header><div class="identity"><h1>${escapeHtml(senderName)}</h1><p>${escapeHtml(senderTitle)}</p></div><div class="contact">${contact
              .map((item) => `<p>${escapeHtml(item)}</p>`)
              .join("")}${renderedLinks
              .map(
                (link) =>
                  `<a href="${escapeHtml(normalizeLinkHref(link.url))}">${escapeHtml(getLinkDisplayText(link, linkDisplayMode))}</a>`,
              )
              .join("")}</div></header><section class="meta">${
              content.date ? `<p class="date">${escapeHtml(content.date)}</p>` : ""
            }${
              recipient.length > 0
                ? `<div class="to">${recipient.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>`
                : ""
            }</section>${
              showTarget
                ? `<section class="subject"><p class="label">Re</p><h2>${subject}</h2></section>`
                : ""
            }`
          : ""
      }<main class="body">${body}</main></article>`;
    })
    .join("")}</body></html>`;
}
