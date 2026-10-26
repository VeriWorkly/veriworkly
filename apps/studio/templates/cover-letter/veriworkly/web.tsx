import { useMemo } from "react";

import type { CSSProperties } from "react";
import type { CoverLetterContent } from "@/features/cover-letter/types";
import type { CoverLetterTokens } from "../tokens";

import {
  getFragmentBoxStyle,
  getFragmentRows,
  getFragmentWords,
  type FlowFragment,
} from "../measure";

import {
  buildVeriworklyFlowItems,
  getCoverLetterState,
  type CoverLetterPalette,
  type VeriworklyFlowItem,
} from "../shared";

import {
  normalizeLinkHref,
  getLinkDisplayText,
} from "@/features/documents/rendering/resume-rendering";
import { FONT_FAMILY_MAP } from "@/features/documents/constants/fonts";
import { escapeHtml } from "@/features/resume/services/resume-formatters";
import { webFixedWidth, webFlexible } from "@/templates/shared/box";
import { webText } from "@/templates/shared/text-tokens";
import { BULLET_MARKER } from "@/templates/resume/shared/typography";
import { COVER_LETTER_SCALE as S } from "../tokens";
import { useFlowPages } from "../use-flow-pages";
import { coverLetterHtmlDocument, htmlFont, htmlLink } from "../html";

import { WebSocialIcon } from "@/templates/shared/web-social-icon";

const px = (value: number) => `${value}px`;

function renderFlowItem(
  fragment: FlowFragment<VeriworklyFlowItem>,
  palette: CoverLetterPalette,
  tokens: CoverLetterTokens,
  paragraphSpacing: number,
) {
  const { item } = fragment;
  const spacing = { marginBottom: px(paragraphSpacing) };
  const cut = getFragmentBoxStyle(fragment);

  if (item.type === "greeting")
    return <p style={{ ...webText(tokens.strong), ...spacing, ...cut }}>{item.text}</p>;

  if (item.type === "paragraph") {
    const text = getFragmentWords(item.text, fragment.range);

    return text ? <p style={{ ...webText(tokens.body), ...spacing, ...cut }}>{text}</p> : null;
  }

  if (item.type === "body-list")
    return (
      <div
        style={{
          backgroundColor: palette.surface,
          paddingBottom: px(S.listPadY),
          paddingLeft: px(S.listPadX),
          paddingRight: px(S.listPadX),
          paddingTop: px(S.listPadY),
          ...spacing,
          ...cut,
        }}
      >
        {getFragmentRows(item.items, fragment.range).map(({ row, index }) => (
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
              {BULLET_MARKER}
            </span>
            <span style={{ ...webText(tokens.body), ...webFlexible }}>{row}</span>
          </div>
        ))}
      </div>
    );

  if (item.type === "proof-item")
    return (
      <div style={cut}>
        {item.heading ? (
          <p
            style={{
              ...webText(tokens.continued),
              borderTop: `${S.hairline}px solid ${palette.border}`,
              marginTop: px(S.subjectTop),
              paddingTop: px(S.railTargetTop),
            }}
          >
            Selected Proof
          </p>
        ) : null}

        <div
          style={{
            borderBottom: item.isLast ? "none" : `${S.hairline}px solid ${palette.border}`,
            columnGap: "12px",
            display: "flex",
            marginTop: px(S.proofRowGap),
            paddingBottom: px(S.proofPadBottom),
          }}
        >
          <span
            style={{
              ...webText(tokens.proofIndex),
              ...webFixedWidth(S.proofIndexWidth),
            }}
          >
            {String(item.index + 1).padStart(2, "0")}
          </span>

          <span style={{ ...webText(tokens.proofText), ...webFlexible }}>{item.text}</span>
        </div>
      </div>
    );

  if (item.type === "signoff")
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: px(S.subjectTop),
          rowGap: "8px",
          ...cut,
        }}
      >
        {item.closing ? <p style={webText(tokens.body)}>{item.closing}</p> : null}
        {item.signature ? (
          <p style={{ ...webText(tokens.strong), fontSize: "16px", lineHeight: "19.2px" }}>
            {item.signature}
          </p>
        ) : null}
      </div>
    );

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

function RecipientMeta({
  date,
  palette,
  recipient,
  tokens,
}: {
  date: string;
  palette: CoverLetterPalette;
  recipient: string[];
  tokens: CoverLetterTokens;
}) {
  return (
    <div
      style={{
        borderBottom: `${S.hairline}px solid ${palette.border}`,
        columnGap: px(S.metaColumnGap),
        display: "flex",
        justifyContent: "space-between",
        paddingBottom: px(S.headerPadBottom),
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          ...webFlexible,
          rowGap: px(S.metaRowGap),
        }}
      >
        {recipient.map((line, index) => (
          <p key={index} style={webText(tokens.contact)}>
            {line}
          </p>
        ))}
      </div>

      {/*
        A fixed date column, not a content-sized one.

        react-pdf reads `flexShrink: 0` as `value || 1`, so a date column that
        must not shrink there cannot say so — it gets squeezed and the date
        wraps in the export while the preview keeps it on one line. Pinning the
        width states the same split to both engines, and the text is
        right-aligned so a short date looks identical either way.
      */}
      {date ? (
        <p
          style={{
            ...webText(tokens.metaDate),
            ...webFixedWidth(S.metaDateWidth),
            textAlign: "right",
          }}
        >
          {date}
        </p>
      ) : null}
    </div>
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
        borderLeft: `${S.subjectBarWidth}px solid ${palette.accent}`,
        marginTop: px(S.subjectTop),
        paddingLeft: px(S.subjectPadLeft),
      }}
    >
      <p style={webText(tokens.railLabel)}>Cover Letter</p>
      <h2 style={{ ...webText(tokens.railSubject), marginTop: px(S.subjectLabelGap) }}>
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
  return {
    display: "flex",
    flexDirection: "column",
    marginTop: continued ? 0 : px(S.subjectTop),
  };
}

function renderVeriworklyHtmlItem(item: VeriworklyFlowItem) {
  if (item.type === "greeting") return `<p class="greeting">${escapeHtml(item.text)}</p>`;
  if (item.type === "paragraph") return `<p>${escapeHtml(item.text)}</p>`;
  if (item.type === "body-list") {
    return `<div class="list">${item.items
      .map(
        (listItem) =>
          `<div class="bullet"><span class="marker">${BULLET_MARKER}</span><span>${escapeHtml(listItem)}</span></div>`,
      )
      .join("")}</div>`;
  }
  if (item.type === "proof-item") {
    const index = String(item.index + 1).padStart(2, "0");

    return `<div class="proof">${item.heading ? `<p class="proof-label">Selected Proof</p>` : ""}<div class="proof-item${item.isLast ? " last" : ""}"><span class="proof-index">${index}</span><span class="proof-text">${escapeHtml(item.text)}</span></div></div>`;
  }
  if (item.type === "signoff") {
    return `<div class="signoff">${item.closing ? `<p>${escapeHtml(item.closing)}</p>` : ""}${
      item.signature ? `<p class="signature">${escapeHtml(item.signature)}</p>` : ""
    }</div>`;
  }

  return `<p class="postscript">${escapeHtml(item.text)}</p>`;
}

export function VeriworklyCoverLetterPreview({ content }: { content: CoverLetterContent }) {
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
    targetTitle,
    targetCompany,
  } = state;
  const fontFamily = FONT_FAMILY_MAP[appearance.fontFamily];
  const flowItems = useMemo(() => buildVeriworklyFlowItems(state.flow), [state.flow]);
  const { pages, measureRef, firstPrefixRef, itemRef } = useFlowPages(flowItems, {
    fontFamily,
    pageColor: appearance.pageColor,
    textColor: palette.text,
    pageMargin: appearance.pageMargin,
    bodyStyle,
    railWidth: S.railWidth,
  });

  const shellStyle: CSSProperties = {
    backgroundColor: appearance.pageColor,
    color: palette.text,
    display: "flex",
    fontFamily,
    // A long email or URL wraps, as the PDF breaks it, instead of running out of the rail.
    overflowWrap: "anywhere",
  };

  // The page box matches the PDF page exactly; see COVER_LETTER_SCALE.
  const pageBox: CSSProperties = { height: px(S.pageHeight), width: px(S.pageWidth) };

  const mainStyle: CSSProperties = {
    backgroundColor: appearance.pageColor,
    ...webFlexible,
    padding: px(appearance.pageMargin),
  };

  function renderSidebar() {
    return (
      <aside
        style={{
          backgroundColor: appearance.sidebarColor,
          borderRight: `${S.hairline}px solid ${palette.sidebarBorder}`,
          display: "flex",
          flexDirection: "column",
          ...webFixedWidth(S.railWidth),
          height: px(S.pageHeight),
          padding: `${px(S.railPadY)} ${px(S.railPadX)}`,
        }}
      >
        <p style={webText(tokens.railLabel)}>Candidate</p>
        {senderName ? (
          <h1 style={{ ...webText(tokens.railName), marginTop: "16px" }}>{senderName}</h1>
        ) : null}
        {senderTitle ? (
          <p style={{ ...webText(tokens.railTitle), marginTop: "8px" }}>{senderTitle}</p>
        ) : null}

        <div
          style={{
            backgroundColor: palette.accent,
            height: px(S.hairline),
            marginBottom: px(S.railBlockTop),
            marginTop: px(S.railBlockTop),
            width: px(S.railRuleWidth),
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: px(S.railBlockTop),
            rowGap: "8px",
          }}
        >
          {contact.map((item, index) => (
            <p key={index} style={webText(tokens.railText)}>
              {item}
            </p>
          ))}

          {renderedLinks.length > 0 && (
            <div
              style={{
                backgroundColor: palette.accent,
                height: px(S.hairline),
                marginBottom: "16px",
                marginTop: "16px",
                width: px(S.railRuleWidth),
              }}
            />
          )}

          {renderedLinks.map((link) => (
            <a
              key={link.id}
              href={normalizeLinkHref(link.url)}
              style={{
                ...webText(tokens.railText),
                alignItems: "center",
                color: palette.accent,
                columnGap: "4px",
                display: "flex",
                textDecoration: "none",
              }}
            >
              {linkDisplayMode !== "url" && (
                <WebSocialIcon color={palette.accent} size={14} type={link.type} />
              )}
              {linkDisplayMode !== "icon" && (
                <span>{getLinkDisplayText(link, linkDisplayMode)}</span>
              )}
            </a>
          ))}
        </div>

        {targetTitle || targetCompany ? (
          <div
            style={{
              borderTop: `${S.hairline}px solid ${palette.sidebarBorder}`,
              display: "flex",
              flexDirection: "column",
              marginTop: "auto",
              paddingTop: px(S.railTargetTop),
              rowGap: "8px",
            }}
          >
            <p style={webText(tokens.railLabel)}>Target</p>
            {targetTitle ? (
              <p
                style={{
                  ...webText(tokens.railText),
                  color: palette.sidebarText,
                  fontWeight: 700,
                }}
              >
                {targetTitle}
              </p>
            ) : null}
            {targetCompany ? <p style={webText(tokens.railText)}>{targetCompany}</p> : null}
          </div>
        ) : null}
      </aside>
    );
  }

  return (
    <div className="grid gap-6">
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none absolute opacity-0"
        style={{ left: -10000, top: 0, width: S.pageWidth }}
      >
        <article className="overflow-hidden" style={{ ...shellStyle, ...pageBox }}>
          {renderSidebar()}

          <main style={mainStyle}>
            <div ref={firstPrefixRef}>
              <RecipientMeta date={date} palette={palette} recipient={recipient} tokens={tokens} />
              {subject ? (
                <SubjectBlock palette={palette} subject={subject} tokens={tokens} />
              ) : null}
            </div>

            <section style={bodyStyle(false)}>
              {flowItems.map((item) => (
                <div key={item.id} ref={itemRef(item.id)}>
                  {renderFlowItem({ item }, palette, tokens, appearance.paragraphSpacing)}
                </div>
              ))}
            </section>
          </main>
        </article>
      </div>

      {pages.map((fragments, pageIndex) => (
        <article
          key={pageIndex}
          className="mx-auto max-w-full overflow-hidden shadow-sm ring-1 ring-zinc-200"
          style={{ ...shellStyle, ...pageBox }}
        >
          {renderSidebar()}

          <main style={mainStyle}>
            {pageIndex === 0 ? (
              <>
                <RecipientMeta
                  date={date}
                  palette={palette}
                  recipient={recipient}
                  tokens={tokens}
                />
                {subject ? (
                  <SubjectBlock palette={palette} subject={subject} tokens={tokens} />
                ) : null}
              </>
            ) : null}

            <section style={bodyStyle(pages.slice(0, pageIndex).some((page) => page.length > 0))}>
              {fragments.map((fragment) => (
                <div key={`${fragment.item.id}-${fragment.range?.[0] ?? 0}`}>
                  {renderFlowItem(fragment, palette, tokens, appearance.paragraphSpacing)}
                </div>
              ))}
            </section>
          </main>
        </article>
      ))}
    </div>
  );
}

export function buildVeriworklyCoverLetterHtml(content: CoverLetterContent): string {
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
    targetTitle,
    targetCompany,
  } = state;
  const flowItems = buildVeriworklyFlowItems(state.flow);
  const font = htmlFont;

  const rail = `<aside><p class="label">Candidate</p>${senderName ? `<h1>${escapeHtml(senderName)}</h1>` : ""}${
    senderTitle ? `<p class="rail-title">${escapeHtml(senderTitle)}</p>` : ""
  }<div class="rule"></div><div class="rail">${contact
    .map((item) => `<p>${escapeHtml(item)}</p>`)
    .join("")}${renderedLinks.length > 0 ? `<div class="divider"></div>` : ""}${renderedLinks
    .map((link) => htmlLink(link, linkDisplayMode, palette.accent, 14))
    .join("")}</div>${
    targetTitle || targetCompany
      ? `<div class="target"><p class="label">Target</p>${
          targetTitle ? `<p class="title">${escapeHtml(targetTitle)}</p>` : ""
        }${targetCompany ? `<p>${escapeHtml(targetCompany)}</p>` : ""}</div>`
      : ""
  }</aside>`;

  const head = `<div class="meta"><div class="to">${recipient
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("")}</div>${date ? `<p class="date">${escapeHtml(date)}</p>` : ""}</div>${
    subject
      ? `<section class="subject"><p class="label">Cover Letter</p><h2>${escapeHtml(subject)}</h2></section>`
      : ""
  }`;

  // One flowing page whose rail runs its full height: the browser's print engine breaks the
  // letter with the same rules react-pdf uses, and the screen copy never clips. In print the
  // rail is fixed, so it repeats on every sheet as it does in the PDF, and the letter's
  // padding is cloned at each break, so page 2 onwards keeps its margins.
  const css = `p,h1,h2{margin:0;white-space:pre-line}.page{width:${S.pageWidth}px;min-height:${S.pageHeight}px;margin:0 auto 24px;background:${appearance.pageColor};box-shadow:0 0 0 1px ${palette.border};display:flex}aside{background:${appearance.sidebarColor};border-right:${S.hairline}px solid ${palette.sidebarBorder};padding:${S.railPadY}px ${S.railPadX}px;display:flex;flex-direction:column;flex:0 0 ${S.railWidth}px;width:${S.railWidth}px}aside h1{${font(t.railName)}margin-top:16px}aside .rail-title{${font(t.railTitle)}margin-top:8px}.rule{background:${palette.accent};height:${S.hairline}px;width:${S.railRuleWidth}px;margin:${S.railBlockTop}px 0}.divider{background:${palette.accent};height:${S.hairline}px;width:${S.railRuleWidth}px;margin:16px 0}.rail{display:flex;flex-direction:column;margin-top:${S.railBlockTop}px;row-gap:8px}.rail p{${font(t.railText)}}.rail a{${font({ ...t.railText, color: palette.accent })}text-decoration:none;display:flex;align-items:center;column-gap:4px}.target{border-top:${S.hairline}px solid ${palette.sidebarBorder};margin-top:auto;padding-top:${S.railTargetTop}px;display:flex;flex-direction:column;row-gap:8px}.target p{${font(t.railText)}}.target .title{${font({ ...t.railText, color: palette.sidebarText, fontWeight: 700 })}}main{flex:1 1 auto;min-width:0;background:${appearance.pageColor};padding:${appearance.pageMargin}px}.label{${font(t.railLabel)}letter-spacing:${t.railLabel.letterSpacing}px;text-transform:uppercase}.meta{display:flex;justify-content:space-between;column-gap:${S.metaColumnGap}px;border-bottom:${S.hairline}px solid ${palette.border};padding-bottom:${S.headerPadBottom}px}.meta .to{display:flex;flex-direction:column;flex:1 1 auto;min-width:0;row-gap:${S.metaRowGap}px}.meta .to p{${font(t.contact)}}.meta .date{${font(t.metaDate)}text-align:right;flex:0 0 ${S.metaDateWidth}px;width:${S.metaDateWidth}px}.subject{border-left:${S.subjectBarWidth}px solid ${palette.accent};margin-top:${S.subjectTop}px;padding-left:${S.subjectPadLeft}px}.subject h2{${font(t.railSubject)}margin-top:${S.subjectLabelGap}px}.body{display:flex;flex-direction:column;margin-top:${S.subjectTop}px}.body p{${font(t.body)}margin-bottom:${appearance.paragraphSpacing}px}.body .greeting{${font(t.strong)}}.greeting,.signoff,.proof,.bullet{break-inside:avoid}.list{background:${palette.surface};padding:${S.listPadY}px ${S.listPadX}px;margin-bottom:${appearance.paragraphSpacing}px}.bullet{display:flex;column-gap:${S.bulletGap}px}.bullet+.bullet{margin-top:${S.bulletRowGap}px}.bullet .marker{flex:0 0 ${S.bulletIndent - S.bulletGap}px;width:${S.bulletIndent - S.bulletGap}px;text-align:right}.bullet span{${font(t.body)}}.body .proof-label{${font(t.continued)}letter-spacing:${t.continued.letterSpacing}px;text-transform:uppercase;border-top:${S.hairline}px solid ${palette.border};margin:${S.subjectTop}px 0 0;padding-top:${S.railTargetTop}px}.proof-item{display:flex;column-gap:12px;border-bottom:${S.hairline}px solid ${palette.border};margin-top:${S.proofRowGap}px;padding-bottom:${S.proofPadBottom}px}.proof-item.last{border-bottom:0}.proof-index{${font(t.proofIndex)}flex:0 0 ${S.proofIndexWidth}px;width:${S.proofIndexWidth}px}.proof-text{${font(t.proofText)}flex:1 1 auto;min-width:0}.signoff{display:flex;flex-direction:column;margin-top:${S.subjectTop}px;row-gap:8px}.body .signoff p{margin-bottom:0}.body .signature{${font({ ...t.strong, fontSize: 16, lineHeight: 19.2 })}}.body .postscript{${font(t.postscript)}border-top:${S.hairline}px solid ${palette.border};margin:${S.postscriptTop}px 0 0;padding-top:${S.postscriptPadTop}px}@page{size:${S.pageWidth}px ${S.pageHeight}px;margin:0}@media print{body{padding:0;background:${appearance.pageColor}}.page{box-shadow:none;margin:0;min-height:0;display:block}aside{position:fixed;top:0;bottom:0;left:0}main{margin-left:${S.railWidth}px;-webkit-box-decoration-break:clone;box-decoration-break:clone}}`;

  return coverLetterHtmlDocument(
    state,
    css,
    `<article class="page">${rail}<main>${head}<section class="body">${flowItems.map(renderVeriworklyHtmlItem).join("")}</section></main></article>`,
  );
}
