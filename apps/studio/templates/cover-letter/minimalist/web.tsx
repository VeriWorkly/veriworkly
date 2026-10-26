import { useMemo } from "react";

import type { CSSProperties } from "react";
import type { CoverLetterContent } from "@/features/cover-letter/types";
import type { ResumeLinkDisplayMode, ResumeLinkItem } from "@/types/resume";
import type { CoverLetterTokens } from "../tokens";

import {
  getFragmentBoxStyle,
  getFragmentRows,
  getFragmentWords,
  type FlowFragment,
} from "../measure";

import {
  buildProfessionalFlowItems,
  getCoverLetterState,
  type CoverLetterPalette,
  type ProfessionalFlowItem,
} from "../shared";

import {
  normalizeLinkHref,
  getLinkDisplayText,
} from "@/features/documents/rendering/resume-rendering";
import { FONT_FAMILY_MAP } from "@/features/documents/constants/fonts";
import { escapeHtml } from "@/features/resume/services/resume-formatters";
import { webFixedWidth, webFlexible } from "@/templates/shared/box";
import { webText } from "@/templates/shared/text-tokens";
import { COVER_LETTER_SCALE as S } from "../tokens";
import { useFlowPages } from "../use-flow-pages";
import { coverLetterHtmlDocument, htmlFont, htmlLink } from "../html";

import { WebSocialIcon } from "@/templates/shared/web-social-icon";

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
  fragment: FlowFragment<ProfessionalFlowItem>,
  palette: CoverLetterPalette,
  tokens: CoverLetterTokens,
  paragraphSpacing: number,
) {
  const { item } = fragment;
  const spacing = { marginBottom: px(paragraphSpacing) };
  const cut = getFragmentBoxStyle(fragment);

  if (item.type === "greeting")
    return <p style={{ ...webText(tokens.strong), ...spacing, ...cut }}>{item.text}</p>;

  if (item.type === "paragraph" || item.type === "closing") {
    const text = getFragmentWords(item.text, fragment.range);

    return text ? <p style={{ ...webText(tokens.body), ...spacing, ...cut }}>{text}</p> : null;
  }

  if (item.type === "body-list" || item.type === "proof-list")
    return (
      <div
        style={{
          borderLeft: `2px solid ${palette.accent}`,
          paddingBottom: px(S.listPadY),
          paddingLeft: px(S.listPadX),
          paddingRight: px(S.listPadX),
          paddingTop: px(S.listPadY),
          ...spacing,
          ...cut,
        }}
      >
        {getFragmentRows(item.items, fragment.range).map(({ row: listItem, index }) => (
          <div
            key={index}
            data-flow-row=""
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

  if (item.type === "signature")
    return <p style={{ ...webText(tokens.strong), ...cut }}>{item.text}</p>;

  const text = getFragmentWords(item.text, fragment.range);

  return text ? (
    <p
      style={{
        ...webText(tokens.postscript),
        borderTop: `${S.hairline}px solid transparent`,
        marginTop: px(S.postscriptTop),
        paddingTop: px(S.postscriptPadTop),
        ...cut,
      }}
    >
      {text}
    </p>
  ) : null;
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
      {/* Untracked, as in `./pdf.tsx`: tracked capitals extract as spaced letters. */}
      <p style={{ ...webText(tokens.label), letterSpacing: 0, marginBottom: px(6) }}>
        Cover Letter
      </p>
      {senderName ? (
        <h1 style={{ ...webText(tokens.senderName), fontWeight: 600 }}>{senderName}</h1>
      ) : null}
      {senderTitle ? (
        <p style={{ ...webText(tokens.senderTitle), marginTop: px(S.subjectLabelGap) }}>
          {senderTitle}
        </p>
      ) : null}

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
            <span key={index} style={{ alignItems: "center", columnGap: px(10), display: "flex" }}>
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
                <WebSocialIcon color={palette.strong} size={S.contact} type={link.type} />
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
          {recipient.map((line, index) => (
            <p key={index} style={webText(tokens.contact)}>
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
      <p style={{ ...webText(tokens.label), letterSpacing: 0 }}>Re</p>
      <h2 style={{ ...webText(tokens.subject), fontWeight: 600, marginTop: px(S.subjectLabelGap) }}>
        {subject}
      </h2>
    </section>
  );
}

/**
 * The letter body is a flex column in every renderer: flex items' margins add up
 * rather than collapse, which is how Yoga lays out the PDF.
 */
function bodyStyle(continued: boolean): CSSProperties {
  return { display: "flex", flexDirection: "column", marginTop: continued ? 0 : px(S.bodyTop) };
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
  if (item.type === "closing") return `<p class="closing">${escapeHtml(item.text)}</p>`;
  if (item.type === "signature") return `<p class="signature">${escapeHtml(item.text)}</p>`;

  return `<p class="postscript">${escapeHtml(item.text)}</p>`;
}

export function MinimalistCoverLetterPreview({ content }: { content: CoverLetterContent }) {
  const state = useMemo(() => getCoverLetterState(content), [content]);
  const {
    appearance,
    palette,
    tokens,
    senderName,
    senderTitle,
    contact,
    linkDisplayMode,
    renderedLinks,
    date,
    recipient,
    subject,
  } = state;
  const fontFamily = FONT_FAMILY_MAP[appearance.fontFamily];
  const flowItems = useMemo(() => buildProfessionalFlowItems(state.flow), [state.flow]);
  const { pages, measureRef, firstPrefixRef, itemRef } = useFlowPages(flowItems, {
    fontFamily,
    pageColor: appearance.pageColor,
    textColor: palette.text,
    pageMargin: appearance.pageMargin,
    bodyStyle,
  });

  const pageStyle: CSSProperties = {
    backgroundColor: appearance.pageColor,
    color: palette.text,
    fontFamily,
    // A long email or URL wraps, as the PDF breaks it, instead of running out of its column.
    overflowWrap: "anywhere",
    padding: px(appearance.pageMargin),
  };

  const pageBox: CSSProperties = { height: px(S.pageHeight), width: px(S.pageWidth) };

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
        style={{ left: -10000, top: 0, width: S.pageWidth }}
      >
        <article className="overflow-hidden" style={{ ...pageStyle, ...pageBox }}>
          <div ref={firstPrefixRef}>
            {head}
            <RecipientMeta date={date} recipient={recipient} tokens={tokens} />
            {subject ? <SubjectBlock palette={palette} subject={subject} tokens={tokens} /> : null}
          </div>

          <main style={bodyStyle(false)}>
            {flowItems.map((item) => (
              <div key={item.id} ref={itemRef(item.id)}>
                {renderFlowItem({ item }, palette, tokens, appearance.paragraphSpacing)}
              </div>
            ))}
          </main>
        </article>
      </div>

      {pages.map((fragments, pageIndex) => (
        <article
          key={pageIndex}
          className="mx-auto max-w-full overflow-hidden shadow-sm ring-1 ring-zinc-200"
          style={{ ...pageStyle, ...pageBox }}
        >
          {pageIndex === 0 ? (
            <>
              {head}
              <RecipientMeta date={date} recipient={recipient} tokens={tokens} />
              {subject ? (
                <SubjectBlock palette={palette} subject={subject} tokens={tokens} />
              ) : null}
            </>
          ) : null}

          <main style={bodyStyle(pages.slice(0, pageIndex).some((page) => page.length > 0))}>
            {fragments.map((fragment) => (
              <div key={`${fragment.item.id}-${fragment.range?.[0] ?? 0}`}>
                {renderFlowItem(fragment, palette, tokens, appearance.paragraphSpacing)}
              </div>
            ))}
          </main>
        </article>
      ))}
    </div>
  );
}

export function buildMinimalistCoverLetterHtml(content: CoverLetterContent): string {
  const state = getCoverLetterState(content);

  const {
    appearance,
    palette,
    tokens: t,
    senderName,
    senderTitle,
    contact,
    linkDisplayMode,
    renderedLinks,
    date,
    recipient,
    subject,
  } = state;
  const flowItems = buildProfessionalFlowItems(state.flow);
  const font = htmlFont;

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
          .map((link) => htmlLink(link, linkDisplayMode, palette.strong, S.contact))
          .join("")}</div>`
      : "";
  const metaBlock = `<section class="meta">${date ? `<p class="date">${escapeHtml(date)}</p>` : ""}${
    recipient.length > 0
      ? `<div class="to">${recipient.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>`
      : ""
  }</section>`;

  const css = `.page{width:${S.pageWidth}px;min-height:${S.pageHeight}px;margin:0 auto 24px;background:${appearance.pageColor};box-shadow:0 0 0 1px ${palette.border};padding:${appearance.pageMargin}px}p,h1,h2{margin:0;white-space:pre-line}header{border-bottom:${S.headerRule}px solid transparent;padding-bottom:${S.headerPadBottom}px}header h1{${font(t.senderName)}font-weight:600}header .title{${font(t.senderTitle)}margin-top:${S.subjectLabelGap}px}.contact-row{display:flex;flex-wrap:wrap;column-gap:10px;row-gap:4px;margin-top:${S.headerRowGap * 2}px}.contact-row .item{display:flex;align-items:center;column-gap:10px}.contact-row .item span{${font(t.contact)}}.contact-row .item .sep{color:${palette.soft}}.links-row{display:flex;flex-wrap:wrap;column-gap:16px;row-gap:4px;margin-top:6px}.links-row a{${font({ ...t.contact, color: palette.strong })}text-decoration:none;display:flex;align-items:center;column-gap:4px}.meta{margin-top:${S.metaTop}px}.meta .date{${font(t.metaDate)}}.meta .to{display:flex;flex-direction:column;row-gap:${S.metaRowGap}px}.meta .date+.to{margin-top:${S.metaRowGap * 2}px}.meta .to p{${font(t.contact)}}.subject{margin-top:${S.subjectTop}px;padding:${S.subjectPadY}px 0}.label{${font(t.label)}letter-spacing:0;text-transform:uppercase}header .label{margin-bottom:6px}.subject h2{${font(t.subject)}font-weight:600;margin-top:${S.subjectLabelGap}px}.body{display:flex;flex-direction:column;margin-top:${S.bodyTop}px}.body p{${font(t.body)}margin-bottom:${appearance.paragraphSpacing}px}.body .greeting,.body .signature{${font(t.strong)}}.body .signature{margin-bottom:0}.greeting,.closing,.signature,.bullet{break-inside:avoid}.list{border-left:2px solid ${palette.accent};padding:${S.listPadY}px ${S.listPadX}px;margin-bottom:${appearance.paragraphSpacing}px}.bullet{display:flex;column-gap:${S.bulletGap}px}.bullet+.bullet{margin-top:${S.bulletRowGap}px}.bullet .marker{flex:0 0 ${S.bulletIndent - S.bulletGap}px;width:${S.bulletIndent - S.bulletGap}px;text-align:right;color:${palette.soft}}.bullet span{${font(t.body)}}.body .postscript{${font(t.postscript)}border-top:${S.hairline}px solid transparent;margin:${S.postscriptTop}px 0 0;padding-top:${S.postscriptPadTop}px}@page{size:${S.pageWidth}px ${S.pageHeight}px;margin:${appearance.pageMargin}px 0}@media print{body{padding:0;background:${appearance.pageColor}}.page{box-shadow:none;margin:0;min-height:0;padding-top:0;padding-bottom:0}}`;

  return coverLetterHtmlDocument(
    state,
    css,
    `<article class="page"><header><p class="label">Cover Letter</p>${senderName ? `<h1>${escapeHtml(senderName)}</h1>` : ""}${senderTitle ? `<p class="title">${escapeHtml(senderTitle)}</p>` : ""}${contactRow}${linksRow}</header>${metaBlock}${
      subject
        ? `<section class="subject"><p class="label">Re</p><h2>${escapeHtml(subject)}</h2></section>`
        : ""
    }<main class="body">${flowItems.map(renderMinimalistHtmlItem).join("")}</main></article>`,
  );
}
