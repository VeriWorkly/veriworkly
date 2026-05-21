/* eslint-disable @next/next/no-img-element */

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type { RichTextBlock } from "../shared";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import {
  getCoverLetterState,
  splitMarkdownLines,
  splitParagraphs,
  splitRichTextBlocks,
} from "../shared";

import {
  normalizeLinkHref,
  getLinkDisplayText,
} from "@/features/documents/rendering/resume-rendering";
import { FONT_FAMILY_MAP, getFontStylesheetHref } from "@/features/documents/constants/fonts";
import { escapeHtml } from "@/features/resume/services/resume-formatters";

import { SOCIAL_ICON_SRC_BY_TYPE } from "@/templates/shared/social-icons";

const PAGE_HEIGHT = 1123;
const BODY_TOP_GAP = 28;
const PARAGRAPH_CHUNK_WORDS = 70;

type ProfessionalFlowItem =
  | { id: string; type: "greeting"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "body-list"; items: string[] }
  | { id: string; type: "proof-list"; items: string[] }
  | { id: string; type: "closing"; text: string }
  | { id: string; type: "signature"; text: string }
  | { id: string; type: "postscript"; text: string };

type CoverLetterFlowContent = Pick<
  CoverLetterContent,
  "body" | "closing" | "greeting" | "highlights" | "opening" | "postscript" | "signature"
>;

function splitTextIntoChunks(text: string, wordsPerChunk = PARAGRAPH_CHUNK_WORDS) {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length <= wordsPerChunk) return [text];

  const chunks: string[] = [];

  for (let index = 0; index < words.length; index += wordsPerChunk) {
    chunks.push(words.slice(index, index + wordsPerChunk).join(" "));
  }

  return chunks;
}

function buildProfessionalFlowItems(content: CoverLetterFlowContent, senderName: string) {
  const items: ProfessionalFlowItem[] = [];

  if (content.greeting) items.push({ id: "greeting", type: "greeting", text: content.greeting });

  const bodyBlocks: RichTextBlock[] = [
    ...splitParagraphs(content.opening).map((text) => ({ type: "paragraph" as const, text })),
    ...splitRichTextBlocks(content.body),
  ];

  bodyBlocks.forEach((block, blockIndex) => {
    if (block.type === "paragraph") {
      splitTextIntoChunks(block.text).forEach((text, chunkIndex) => {
        items.push({
          id: `body-${blockIndex}-${chunkIndex}`,
          type: "paragraph",
          text,
        });
      });
      return;
    }

    items.push({
      id: `body-list-${blockIndex}`,
      type: "body-list",
      items: block.items,
    });
  });

  const highlights = splitMarkdownLines(content.highlights);

  if (highlights.length > 0) {
    items.push({ id: "proof-list", type: "proof-list", items: highlights });
  }

  if (content.closing) items.push({ id: "closing", type: "closing", text: content.closing });

  items.push({ id: "signature", type: "signature", text: content.signature || senderName });

  if (content.postscript) {
    splitTextIntoChunks(content.postscript, 55).forEach((text, index) => {
      items.push({ id: `postscript-${index}`, type: "postscript", text });
    });
  }

  return items;
}

function renderFlowItem(item: ProfessionalFlowItem, accentColor: string) {
  if (item.type === "greeting") return <p className="font-medium text-zinc-950">{item.text}</p>;

  if (item.type === "paragraph") return <p className="mt-(--paragraph-gap)">{item.text}</p>;

  if (item.type === "body-list")
    return (
      <ul className="mt-(--paragraph-gap) grid gap-2 bg-zinc-50 px-5 py-4">
        {item.items.map((listItem) => (
          <li key={listItem} className="grid grid-cols-[0.65rem_1fr] gap-3">
            <span
              className="mt-2.5 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: accentColor }}
            />

            <span>{listItem}</span>
          </li>
        ))}
      </ul>
    );

  if (item.type === "proof-list")
    return (
      <ul className="my-6 grid gap-2 bg-zinc-50 px-5 py-4">
        {item.items.map((proof) => (
          <li key={proof} className="grid grid-cols-[0.65rem_1fr] gap-3">
            <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-zinc-950" />
            <span>{proof}</span>
          </li>
        ))}
      </ul>
    );

  if (item.type === "closing") return <p>{item.text}</p>;

  if (item.type === "signature")
    return <p className="pt-1 font-semibold text-zinc-950">{item.text}</p>;

  return (
    <p className="mt-5 border-t border-zinc-200 pt-3 text-sm leading-6 text-zinc-600">
      P.S. {item.text}
    </p>
  );
}

function renderGroupedFlowItems(items: ProfessionalFlowItem[], accentColor: string) {
  const nodes: React.ReactNode[] = [];
  let index = 0;

  while (index < items.length) {
    const item = items[index];

    nodes.push(
      <div key={item.id} className="flow-root">
        {renderFlowItem(item, accentColor)}
      </div>,
    );
    index += 1;
  }

  return nodes;
}

function paginateMeasuredItems<T extends { id: string }>(
  items: T[],
  heights: Map<string, number>,
  firstLimit: number,
  nextLimit: number,
) {
  const pages: T[][] = [[]];
  let pageIndex = 0;
  let used = 0;

  for (const item of items) {
    const height = Math.ceil(heights.get(item.id) ?? 0);
    const limit = pageIndex === 0 ? firstLimit : nextLimit;

    if (pages[pageIndex].length > 0 && used + height > limit) {
      pages.push([]);
      pageIndex += 1;
      used = 0;
    }

    pages[pageIndex].push(item);
    used += height;
  }

  return pages.filter((page) => page.length > 0);
}

function getProfessionalHtmlItemWeight(item: ProfessionalFlowItem) {
  if (item.type === "body-list" || item.type === "proof-list") {
    return 2 + item.items.reduce((total, listItem) => total + Math.ceil(listItem.length / 78), 0);
  }

  if (item.type === "postscript") return 2 + Math.ceil(item.text.length / 110);
  if (item.type === "closing" || item.type === "signature" || item.type === "greeting") return 1;

  return Math.max(1, Math.ceil(item.text.length / 92));
}

function paginateProfessionalHtmlItems(items: ProfessionalFlowItem[]) {
  const pages: ProfessionalFlowItem[][] = [[]];
  let pageIndex = 0;
  let used = 0;

  for (const item of items) {
    const limit = pageIndex === 0 ? 17 : 26;
    const weight = getProfessionalHtmlItemWeight(item);

    if (pages[pageIndex].length > 0 && used + weight > limit) {
      pages.push([]);
      pageIndex += 1;
      used = 0;
    }

    pages[pageIndex].push(item);
    used += weight;
  }

  return pages.filter((page) => page.length > 0);
}

function renderProfessionalHtmlItem(item: ProfessionalFlowItem) {
  if (item.type === "greeting") return `<p class="greeting">${escapeHtml(item.text)}</p>`;
  if (item.type === "paragraph") return `<p>${escapeHtml(item.text)}</p>`;
  if (item.type === "body-list") {
    return `<ul class="body-list">${item.items.map((listItem) => `<li>${escapeHtml(listItem)}</li>`).join("")}</ul>`;
  }
  if (item.type === "proof-list") {
    return `<ul class="proof">${item.items.map((proof) => `<li>${escapeHtml(proof)}</li>`).join("")}</ul>`;
  }
  if (item.type === "closing") return `<p>${escapeHtml(item.text)}</p>`;
  if (item.type === "signature") return `<p class="signature">${escapeHtml(item.text)}</p>`;

  return `<p class="postscript">P.S. ${escapeHtml(item.text)}</p>`;
}

export function ProfessionalCoverLetterPreview({ content }: { content: CoverLetterContent }) {
  const state = getCoverLetterState(content, { firstPage: 18, nextPage: 27 });
  const {
    appearance,
    senderName,
    senderTitle,
    contact,
    linkDisplayMode,
    renderedLinks,
    recipient,
  } = state;
  const fontFamily = FONT_FAMILY_MAP[appearance.fontFamily];
  const flowSenderName = content.senderName || content.signature || "Your Name";
  const flowContent = useMemo(
    () => ({
      body: content.body,
      closing: content.closing,
      greeting: content.greeting,
      highlights: content.highlights,
      opening: content.opening,
      postscript: content.postscript,
      signature: content.signature,
    }),
    [
      content.body,
      content.closing,
      content.greeting,
      content.highlights,
      content.opening,
      content.postscript,
      content.signature,
    ],
  );
  const flowItems = useMemo(
    () => buildProfessionalFlowItems(flowContent, flowSenderName),
    [flowContent, flowSenderName],
  );
  const [pages, setPages] = useState<ProfessionalFlowItem[][]>(() => [flowItems]);
  const firstPrefixRef = useRef<HTMLDivElement | null>(null);
  const nextPrefixRef = useRef<HTMLParagraphElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const firstPrefixHeight = firstPrefixRef.current?.getBoundingClientRect().height ?? 0;
      const nextPrefixHeight = nextPrefixRef.current?.getBoundingClientRect().height ?? 0;
      const firstLimit = PAGE_HEIGHT - appearance.pageMargin * 2 - firstPrefixHeight - BODY_TOP_GAP;
      const nextLimit = PAGE_HEIGHT - appearance.pageMargin * 2 - nextPrefixHeight - BODY_TOP_GAP;
      const heights = new Map<string, number>();

      flowItems.forEach((item) => {
        const node = itemRefs.current.get(item.id);
        heights.set(item.id, node?.getBoundingClientRect().height ?? 0);
      });

      const nextPages = paginateMeasuredItems(flowItems, heights, firstLimit, nextLimit);
      const nextKey = nextPages.map((page) => page.map((item) => item.id).join(",")).join("|");

      setPages((current) => {
        const currentKey = current.map((page) => page.map((item) => item.id).join(",")).join("|");
        return currentKey === nextKey ? current : nextPages;
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [appearance.lineHeight, appearance.pageMargin, appearance.paragraphSpacing, flowItems]);

  return (
    <div className="grid gap-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute opacity-0"
        style={{ left: -10000, top: 0, width: 794 }}
      >
        <article
          className="h-280.75 w-198.5 overflow-hidden"
          style={{
            color: appearance.textColor,
            fontFamily,
            padding: appearance.pageMargin,
            backgroundColor: appearance.pageColor,
          }}
        >
          <div ref={firstPrefixRef}>
            <header className="grid gap-8 border-b-2 pb-7 sm:grid-cols-[1fr_230px]">
              <div>
                <h1 className="text-[34px] leading-tight font-semibold tracking-normal text-zinc-950">
                  {senderName}
                </h1>

                <p className="mt-2 text-sm font-medium text-zinc-600">{senderTitle}</p>
              </div>

              <div className="space-y-1.5 text-sm leading-5 text-zinc-600 sm:text-right">
                {contact.map((item) => (
                  <p key={item}>{item}</p>
                ))}

                {renderedLinks.map((link) => (
                  <a
                    key={link.id}
                    className="flex items-center justify-end gap-1 font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4"
                    href={normalizeLinkHref(link.url)}
                  >
                    {linkDisplayMode !== "url" && (
                      <img
                        alt=""
                        aria-hidden="true"
                        className="size-3 shrink-0"
                        src={SOCIAL_ICON_SRC_BY_TYPE[link.type] || SOCIAL_ICON_SRC_BY_TYPE.custom}
                      />
                    )}

                    {linkDisplayMode !== "icon" && getLinkDisplayText(link, linkDisplayMode)}
                  </a>
                ))}
              </div>
            </header>

            <section className="mt-9 grid gap-8 text-sm leading-5 text-zinc-700 sm:grid-cols-[1fr_180px]">
              <div className="space-y-1">
                {recipient.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              {content.date ? (
                <p className="font-medium text-zinc-500 sm:text-right">{content.date}</p>
              ) : null}
            </section>

            {content.subject || content.jobTitle ? (
              <section className="mt-8 border-y border-zinc-200 py-4">
                <p
                  className="text-[10px] font-bold tracking-[0.22em] uppercase"
                  style={{ color: appearance.accentColor }}
                >
                  Re
                </p>

                <h2 className="mt-2 text-xl leading-snug font-semibold tracking-normal text-zinc-950">
                  {content.subject || content.jobTitle}
                </h2>
              </section>
            ) : null}
          </div>

          <p
            ref={nextPrefixRef}
            className="border-b border-zinc-200 pb-5 text-[10px] font-bold tracking-[0.22em] text-zinc-500 uppercase"
          >
            Cover Letter Continued
          </p>

          <main
            className="mt-7 text-[15px] text-zinc-800"
            style={{
              lineHeight: appearance.lineHeight,
              ["--paragraph-gap" as string]: `${appearance.paragraphSpacing}px`,
            }}
          >
            {flowItems.map((item) => (
              <div
                key={item.id}
                ref={(node) => {
                  if (node) itemRefs.current.set(item.id, node);
                  else itemRefs.current.delete(item.id);
                }}
                className="flow-root"
              >
                {renderFlowItem(item, appearance.accentColor)}
              </div>
            ))}
          </main>
        </article>
      </div>

      {pages.map((pageBlocks, pageIndex) => (
        <article
          key={pageIndex}
          className="mx-auto h-280.75 w-198.5 max-w-full overflow-hidden shadow-sm ring-1 ring-zinc-200"
          style={{
            color: appearance.textColor,
            fontFamily,
            padding: appearance.pageMargin,
            backgroundColor: appearance.pageColor,
          }}
        >
          {pageIndex === 0 ? (
            <>
              <header className="grid gap-8 border-b-2 pb-7 sm:grid-cols-[1fr_230px]">
                <div>
                  <h1 className="text-[34px] leading-tight font-semibold tracking-normal text-zinc-950">
                    {senderName}
                  </h1>

                  <p className="mt-2 text-sm font-medium text-zinc-600">{senderTitle}</p>
                </div>

                {contact.length > 0 || renderedLinks.length > 0 ? (
                  <div className="space-y-1.5 text-sm leading-5 text-zinc-600 sm:text-right">
                    {contact.map((item) => (
                      <p key={item}>{item}</p>
                    ))}

                    {renderedLinks.map((link) => (
                      <a
                        key={link.id}
                        className="flex items-center justify-end gap-1 font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4"
                        href={normalizeLinkHref(link.url)}
                      >
                        {linkDisplayMode !== "url" && (
                          <img
                            alt=""
                            aria-hidden="true"
                            className="size-3 shrink-0"
                            src={
                              SOCIAL_ICON_SRC_BY_TYPE[link.type] || SOCIAL_ICON_SRC_BY_TYPE.custom
                            }
                          />
                        )}

                        {linkDisplayMode !== "icon" && getLinkDisplayText(link, linkDisplayMode)}
                      </a>
                    ))}
                  </div>
                ) : null}
              </header>

              <section className="mt-9 grid gap-8 text-sm leading-5 text-zinc-700 sm:grid-cols-[1fr_180px]">
                <div className="space-y-1">
                  {recipient.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>

                {content.date ? (
                  <p className="font-medium text-zinc-500 sm:text-right">{content.date}</p>
                ) : null}
              </section>

              {content.subject || content.jobTitle ? (
                <section className="mt-8 border-y border-zinc-200 py-4">
                  <p
                    className="text-[10px] font-bold tracking-[0.22em] uppercase"
                    style={{ color: appearance.accentColor }}
                  >
                    Re
                  </p>

                  <h2 className="mt-2 text-xl leading-snug font-semibold tracking-normal text-zinc-950">
                    {content.subject || content.jobTitle}
                  </h2>
                </section>
              ) : null}
            </>
          ) : (
            <p className="border-b border-zinc-200 pb-5 text-[10px] font-bold tracking-[0.22em] text-zinc-500 uppercase">
              Cover Letter Continued
            </p>
          )}

          <main
            className="mt-7 text-[15px] text-zinc-800"
            style={{
              lineHeight: appearance.lineHeight,
              ["--paragraph-gap" as string]: `${appearance.paragraphSpacing}px`,
            }}
          >
            {renderGroupedFlowItems(pageBlocks, appearance.accentColor)}
          </main>
        </article>
      ))}
    </div>
  );
}

export function buildProfessionalCoverLetterHtml(content: CoverLetterContent): string {
  const state = getCoverLetterState(content, { firstPage: 18, nextPage: 27 });

  const {
    appearance,
    senderName,
    senderTitle,
    contact,
    linkDisplayMode,
    renderedLinks,
    recipient,
  } = state;
  const subject = escapeHtml(content.subject || content.jobTitle || "Application");
  const fontFamily = FONT_FAMILY_MAP[appearance.fontFamily];
  const fontHref = getFontStylesheetHref(appearance.fontFamily);
  const flowItems = buildProfessionalFlowItems(content, senderName);
  const pages = paginateProfessionalHtmlItems(flowItems);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(content.senderName || "Cover Letter")}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${escapeHtml(fontHref)}"><style>
*{box-sizing:border-box}body{margin:0;padding:32px 16px;background:#f4f4f5;color:${appearance.textColor};font-family:${fontFamily}}.page{width:794px;height:1123px;margin:0 auto 24px;overflow:hidden;background:${appearance.pageColor};color:${appearance.textColor};box-shadow:0 0 0 1px #e4e4e7;page-break-after:always}.page:last-child{page-break-after:auto}p{margin:0 0 ${appearance.paragraphSpacing}px;line-height:${appearance.lineHeight}}.label{color:${appearance.accentColor};font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase}.body{margin-top:28px;font-size:15px}.body-list,.proof{background:#f4f4f5;margin:16px 0;padding:14px 18px 14px 28px;line-height:${appearance.lineHeight}}.proof li::marker{color:${appearance.accentColor}}.signature{font-weight:700}.postscript{border-top:1px solid #e4e4e7;padding-top:14px;color:#52525b}.continued{border-bottom:1px solid #dbe4f0;padding-bottom:20px;color:#64748b;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase}.professional-page{padding:${appearance.pageMargin}px}.professional-page header{display:grid;grid-template-columns:1fr 230px;gap:32px;border-bottom:2px solid #09090b;padding-bottom:28px}.professional-page h1{margin:0;font-size:34px;line-height:1.1}.professional-page .contact{text-align:right;color:#52525b}.professional-page .contact a{display:block;color:#09090b;font-weight:600;text-underline-offset:4px}.professional-page .meta{display:grid;grid-template-columns:1fr 180px;gap:32px;margin-top:36px;color:#3f3f46}.professional-page .subject{border-top:1px solid #e4e4e7;border-bottom:1px solid #e4e4e7;margin-top:32px;padding:16px 0}.professional-page h2{margin:8px 0 0;font-size:20px}@media print{body{padding:0;background:white}.page{box-shadow:none;margin:0}}</style></head><body>${pages
    .map((blocks, pageIndex) => {
      const first = pageIndex === 0;
      const body = blocks.map((item) => renderProfessionalHtmlItem(item)).join("");
      return `<article class="page professional-page">${first ? `<header><div><h1>${escapeHtml(senderName)}</h1><p>${escapeHtml(senderTitle)}</p></div><div class="contact">${contact.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}${renderedLinks.map((link) => `<a href="${escapeHtml(normalizeLinkHref(link.url))}">${escapeHtml(getLinkDisplayText(link, linkDisplayMode))}</a>`).join("")}</div></header><section class="meta"><div>${recipient.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div><p>${escapeHtml(content.date)}</p></section><section class="subject"><p class="label">Re</p><h2>${subject}</h2></section>` : `<p class="continued">Cover Letter Continued</p>`}<main class="body">${body}</main></article>`;
    })
    .join("")}</body></html>`;
}
