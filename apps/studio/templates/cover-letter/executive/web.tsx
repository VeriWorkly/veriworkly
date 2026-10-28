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
import { documentPrintCss } from "@/templates/shared/print-styles";
import { coverLetterHtmlDocument, htmlFont, htmlLink } from "../html";

import { WebSocialIcon } from "@/templates/shared/web-social-icon";

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
          borderBottom: `${S.hairline}px solid ${palette.border}`,
          borderTop: `${S.hairline}px solid ${palette.border}`,
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
        {senderName ? (
          <h1 style={{ ...webText(tokens.senderName), letterSpacing: 0.4 }}>{senderName}</h1>
        ) : null}
        {senderTitle ? (
          <p
            style={{
              ...webText(tokens.senderTitle),
              marginTop: px(S.subjectLabelGap),
              textTransform: "uppercase",
            }}
          >
            {senderTitle}
          </p>
        ) : null}
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
          {contact.map((item, index) => (
            <p key={index} style={{ ...webText(tokens.contact), textAlign: "right" }}>
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

/**
 * The letter body is a flex column in every renderer: flex items' margins add up
 * rather than collapse, which is how Yoga lays out the PDF.
 */
function bodyStyle(continued: boolean): CSSProperties {
  return { display: "flex", flexDirection: "column", marginTop: continued ? 0 : px(S.bodyTop) };
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
  if (item.type === "closing") return `<p class="closing">${escapeHtml(item.text)}</p>`;
  if (item.type === "signature") return `<p class="signature">${escapeHtml(item.text)}</p>`;

  return `<p class="postscript">${escapeHtml(item.text)}</p>`;
}

export function ExecutiveCoverLetterPreview({ content }: { content: CoverLetterContent }) {
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

export function buildExecutiveCoverLetterHtml(content: CoverLetterContent): string {
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

  const contactColumn =
    contact.length > 0 || renderedLinks.length > 0
      ? `<div class="contact">${contact
          .map((item) => `<p>${escapeHtml(item)}</p>`)
          .join("")}${renderedLinks
          .map((link) => htmlLink(link, linkDisplayMode, palette.strong, S.contact))
          .join("")}</div>`
      : "";

  const css = `.page{width:${state.page.widthPx}px;min-height:${state.page.heightPx}px;margin:0 auto 24px;background:${appearance.pageColor};box-shadow:0 0 0 1px ${palette.border};padding:${appearance.pageMargin}px}p,h1,h2{margin:0;white-space:pre-line}header{display:flex;border-top:${S.hairline}px solid ${palette.strong};border-bottom:${S.hairline}px solid ${palette.strong};padding-top:${S.subjectLabelGap}px;padding-bottom:${S.headerPadBottom}px}header .identity{flex:1 1 auto;min-width:0;text-align:center}header h1{${font(t.senderName)}letter-spacing:0.4px}header .identity p{${font(t.senderTitle)}margin-top:${S.subjectLabelGap}px;text-transform:uppercase}.contact{display:flex;flex-direction:column;align-items:flex-end;flex:0 0 ${S.headerContactWidth}px;width:${S.headerContactWidth}px;margin-left:${S.headerColumnGap}px;row-gap:${S.headerRowGap}px}.contact p{${font(t.contact)}text-align:right}.contact a{${font({ ...t.contact, color: palette.strong })}text-decoration:none}.meta{margin-top:${S.metaTop}px}.meta .date{${font(t.metaDate)}text-align:center}.meta .to{display:flex;flex-direction:column;row-gap:${S.metaRowGap}px}.meta .date+.to{margin-top:${S.metaRowGap * 3}px}.meta .to p{${font(t.contact)}}.subject{border-bottom:${S.hairline}px solid ${palette.border};margin-top:${S.subjectTop}px;padding-bottom:${S.subjectPadY}px}.label{${font(t.label)}letter-spacing:${(t.label.letterSpacing ?? 0) + 1}px;text-transform:uppercase}.subject h2{${font(t.subject)}margin-top:${S.subjectLabelGap}px}.body{display:flex;flex-direction:column;margin-top:${S.bodyTop}px}.body p{${font(t.body)}margin-bottom:${appearance.paragraphSpacing}px}.body .greeting,.body .signature{${font(t.strong)}}.body .signature{margin-bottom:0}.list{border-top:${S.hairline}px solid ${palette.border};border-bottom:${S.hairline}px solid ${palette.border};padding:${S.listPadY}px ${S.listPadX}px;margin-bottom:${appearance.paragraphSpacing}px}.bullet{display:flex;column-gap:${S.bulletGap}px}.bullet+.bullet{margin-top:${S.bulletRowGap}px}.bullet .marker{flex:0 0 ${S.bulletIndent - S.bulletGap}px;width:${S.bulletIndent - S.bulletGap}px;text-align:right;color:${palette.accent}}.bullet span{${font(t.body)}}.body .postscript{${font(t.postscript)}border-top:${S.hairline}px solid ${palette.border};margin:${S.postscriptTop}px 0 0;padding-top:${S.postscriptPadTop}px}${documentPrintCss(
    {
      paperSize: state.page.paperSize,
      pageMarginY: appearance.pageMargin,
      background: appearance.pageColor,
      sheet: ".page",
      sheetPrint: "padding-top:0;padding-bottom:0",
      flow: ".body",
      keepTogether: [".greeting", ".closing", ".signature", ".bullet"],
    },
  )}`;

  return coverLetterHtmlDocument(
    state,
    css,
    `<article class="page"><header><div class="identity">${senderName ? `<h1>${escapeHtml(senderName)}</h1>` : ""}${senderTitle ? `<p>${escapeHtml(senderTitle)}</p>` : ""}</div>${contactColumn}</header><section class="meta">${
      date ? `<p class="date">${escapeHtml(date)}</p>` : ""
    }${
      recipient.length > 0
        ? `<div class="to">${recipient.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>`
        : ""
    }</section>${
      subject
        ? `<section class="subject"><p class="label">Re</p><h2>${escapeHtml(subject)}</h2></section>`
        : ""
    }<main class="body">${flowItems.map(renderExecutiveHtmlItem).join("")}</main></article>`,
  );
}
