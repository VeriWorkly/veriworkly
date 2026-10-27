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

/** A plain hyphen, not a typographic bullet, for parsers that treat markers literally. */
const ATS_MARKER = "-";

/**
 * Same single-column flow as `../professional`, stripped of every non-text
 * decoration: no shaded blocks, no colour-only cues, one hairline instead of
 * a heavy rule. This is the template to recommend when a candidate does not
 * know which ATS will read the file.
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
                ...webFixedWidth(S.bulletIndent - S.bulletGap),
                textAlign: "right",
              }}
            >
              {ATS_MARKER}
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
        borderTop: `${S.hairline}px solid ${palette.border}`,
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
 * The classic block-letter format: name, title, and every contact line
 * stacked left with nothing beside them — no column split anywhere on the
 * page. This is the arrangement most business-writing guides teach, and the
 * one least likely to confuse a parser that reads strictly top-to-bottom.
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
        borderBottom: `${S.headerRule}px solid ${palette.border}`,
        paddingBottom: px(S.headerPadBottom),
      }}
    >
      {senderName ? <h1 style={webText(tokens.senderName)}>{senderName}</h1> : null}
      {senderTitle ? (
        <p style={{ ...webText(tokens.senderTitle), marginTop: px(S.subjectLabelGap) }}>
          {senderTitle}
        </p>
      ) : null}

      {contact.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: px(S.headerRowGap),
            rowGap: px(4),
          }}
        >
          {contact.map((item, index) => (
            <p key={index} style={webText(tokens.contact)}>
              {item}
            </p>
          ))}
        </div>
      ) : null}

      {renderedLinks.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
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
                color: palette.accent,
                columnGap: "4px",
                display: "flex",
                textDecoration: "none",
              }}
            >
              {linkDisplayMode !== "url" && (
                <WebSocialIcon color={palette.accent} size={S.contact} type={link.type} />
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

/** Date, then the inside address, both left-aligned — no right-hand column. */
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

/**
 * "Re: <subject>" on a single plain line — the most literal, least designed
 * subject treatment in the set. The "Re:" itself carries the chosen accent
 * colour, the only accent used anywhere on the page.
 */
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
    <p style={{ ...webText(tokens.subject), marginTop: px(S.subjectTop) }}>
      <span style={{ color: palette.accent }}>Re:</span> {subject}
    </p>
  );
}

/**
 * The letter body is a flex column in every renderer: flex items' margins add up
 * rather than collapse, which is how Yoga lays out the PDF.
 */
function bodyStyle(continued: boolean): CSSProperties {
  return { display: "flex", flexDirection: "column", marginTop: continued ? 0 : px(S.bodyTop) };
}

function renderAtsEssentialHtmlItem(item: ProfessionalFlowItem) {
  if (item.type === "greeting") return `<p class="greeting">${escapeHtml(item.text)}</p>`;
  if (item.type === "paragraph") return `<p>${escapeHtml(item.text)}</p>`;
  if (item.type === "body-list" || item.type === "proof-list") {
    return `<div class="list">${item.items
      .map(
        (listItem) =>
          `<div class="bullet"><span class="marker">${ATS_MARKER}</span><span>${escapeHtml(listItem)}</span></div>`,
      )
      .join("")}</div>`;
  }
  if (item.type === "closing") return `<p class="closing">${escapeHtml(item.text)}</p>`;
  if (item.type === "signature") return `<p class="signature">${escapeHtml(item.text)}</p>`;

  return `<p class="postscript">${escapeHtml(item.text)}</p>`;
}

export function AtsEssentialCoverLetterPreview({ content }: { content: CoverLetterContent }) {
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
    page: state.page,
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

  const pageBox: CSSProperties = { height: px(state.page.heightPx), width: px(state.page.widthPx) };

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
        style={{ left: -10000, top: 0, width: state.page.widthPx }}
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

export function buildAtsEssentialCoverLetterHtml(content: CoverLetterContent): string {
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

  const contactBlock =
    contact.length > 0
      ? `<div class="contact-block">${contact.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`
      : "";
  const linksBlock =
    renderedLinks.length > 0
      ? `<div class="links-block">${renderedLinks
          .map((link) => htmlLink(link, linkDisplayMode, palette.accent, S.contact))
          .join("")}</div>`
      : "";
  const metaBlock = `<section class="meta">${date ? `<p class="date">${escapeHtml(date)}</p>` : ""}${
    recipient.length > 0
      ? `<div class="to">${recipient.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>`
      : ""
  }</section>`;

  const css = `.page{width:${state.page.widthPx}px;min-height:${state.page.heightPx}px;margin:0 auto 24px;background:${appearance.pageColor};box-shadow:0 0 0 1px ${palette.border};padding:${appearance.pageMargin}px}p,h1,h2{margin:0;white-space:pre-line}header{border-bottom:${S.headerRule}px solid ${palette.border};padding-bottom:${S.headerPadBottom}px}header h1{${font(t.senderName)}}header .title{${font(t.senderTitle)}margin-top:${S.subjectLabelGap}px}.contact-block{display:flex;flex-direction:column;row-gap:4px;margin-top:${S.headerRowGap}px}.contact-block p{${font(t.contact)}}.links-block{display:flex;flex-direction:column;row-gap:4px;margin-top:6px}.links-block a{${font({ ...t.contact, color: palette.accent })}text-decoration:none}.meta{margin-top:${S.metaTop}px}.meta .date{${font(t.metaDate)}}.meta .to{display:flex;flex-direction:column;row-gap:${S.metaRowGap}px}.meta .date+.to{margin-top:${S.metaRowGap * 2}px}.meta .to p{${font(t.contact)}}.subject{${font(t.subject)}margin-top:${S.subjectTop}px}.subject .re{color:${palette.accent}}.body{display:flex;flex-direction:column;margin-top:${S.bodyTop}px}.body p{${font(t.body)}margin-bottom:${appearance.paragraphSpacing}px}.body .greeting,.body .signature{${font(t.strong)}}.body .signature{margin-bottom:0}.greeting,.closing,.signature,.bullet{break-inside:avoid}.list{padding:${S.listPadY}px ${S.listPadX}px;margin-bottom:${appearance.paragraphSpacing}px}.bullet{display:flex;column-gap:${S.bulletGap}px}.bullet+.bullet{margin-top:${S.bulletRowGap}px}.bullet .marker{flex:0 0 ${S.bulletIndent - S.bulletGap}px;width:${S.bulletIndent - S.bulletGap}px;text-align:right}.bullet span{${font(t.body)}}.body .postscript{${font(t.postscript)}border-top:${S.hairline}px solid ${palette.border};margin:${S.postscriptTop}px 0 0;padding-top:${S.postscriptPadTop}px}@page{size:${state.page.widthPx}px ${state.page.heightPx}px;margin:${appearance.pageMargin}px 0}@media print{body{padding:0;background:${appearance.pageColor}}.page{box-shadow:none;margin:0;min-height:0;padding-top:0;padding-bottom:0}}`;

  return coverLetterHtmlDocument(
    state,
    css,
    `<article class="page"><header>${senderName ? `<h1>${escapeHtml(senderName)}</h1>` : ""}${senderTitle ? `<p class="title">${escapeHtml(senderTitle)}</p>` : ""}${contactBlock}${linksBlock}</header>${metaBlock}${
      subject ? `<p class="subject"><span class="re">Re:</span> ${escapeHtml(subject)}</p>` : ""
    }<main class="body">${flowItems.map(renderAtsEssentialHtmlItem).join("")}</main></article>`,
  );
}
