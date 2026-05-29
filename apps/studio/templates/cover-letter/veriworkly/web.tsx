/* eslint-disable @next/next/no-img-element */

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type { CoverLetterContent } from "@/features/cover-letter/types";

import {
  buildCoverLetterFlowContent,
  buildVeriworklyFlowItems,
  getCoverLetterFlowSenderName,
  getCoverLetterState,
  getFlowPageKey,
  getVeriworklyFlowItemWeight,
  isCoverLetterSectionVisible,
  keepVeriworklyProofHeadingWithNext,
  paginateMeasuredItems,
  paginateWeightedItems,
  type VeriworklyFlowItem,
} from "../shared";

import {
  normalizeLinkHref,
  getLinkDisplayText,
} from "@/features/documents/rendering/resume-rendering";
import { FONT_FAMILY_MAP, getFontStylesheetHref } from "@/features/documents/constants/fonts";
import { escapeHtml } from "@/features/resume/services/resume-formatters";

import { SOCIAL_ICON_SRC_BY_TYPE } from "@/templates/shared/social-icons";

const PAGE_HEIGHT = 1123;

function renderFlowItem(item: VeriworklyFlowItem, accentColor: string) {
  if (item.type === "greeting") return <p className="font-medium text-slate-950">{item.text}</p>;

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

  if (item.type === "proof-heading")
    return (
      <div className="mt-8 border-t border-slate-200 pt-6">
        <p className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
          Selected Proof
        </p>
      </div>
    );

  if (item.type === "proof-item")
    return (
      <div
        className={`grid grid-cols-[1.75rem_1fr] gap-3 border-slate-100 pb-2 ${
          item.index === 0 ? "mt-4" : "mt-2"
        } ${item.isLast ? "" : "border-b"}`}
      >
        <span className="text-xs leading-5 font-bold" style={{ color: accentColor }}>
          {String(item.index + 1).padStart(2, "0")}
        </span>

        <p className="text-sm leading-5 text-slate-700">{item.text}</p>
      </div>
    );

  if (item.type === "signoff")
    return (
      <section className="mt-8 space-y-2 text-[14px] text-slate-700">
        {item.closing ? <p>{item.closing}</p> : null}
        <p className="text-base font-semibold text-slate-950">{item.signature}</p>
      </section>
    );

  return (
    <p className="mt-5 border-t border-zinc-200 pt-3 text-sm leading-6 text-zinc-600">
      P.S. {item.text}
    </p>
  );
}

function renderGroupedFlowItems(items: VeriworklyFlowItem[], accentColor: string) {
  return items.map((item) => (
    <div key={item.id} className="flow-root">
      {renderFlowItem(item, accentColor)}
    </div>
  ));
}

function fitsInsideBottomPadding(container: HTMLElement, content: HTMLElement) {
  const containerStyle = window.getComputedStyle(container);
  const paddingBottom = Number.parseFloat(containerStyle.paddingBottom) || 0;
  const containerBottom = container.getBoundingClientRect().bottom - paddingBottom;
  const contentBottom = content.getBoundingClientRect().bottom;

  return contentBottom <= containerBottom + 1;
}

function paginateVeriworklyHtmlItems(items: VeriworklyFlowItem[]) {
  return paginateWeightedItems(
    items,
    getVeriworklyFlowItemWeight,
    () => 24,
    keepVeriworklyProofHeadingWithNext,
  );
}

function renderVeriworklyHtmlItem(item: VeriworklyFlowItem, accentColor: string) {
  if (item.type === "greeting") return `<p class="greeting">${escapeHtml(item.text)}</p>`;
  if (item.type === "paragraph") return `<p>${escapeHtml(item.text)}</p>`;
  if (item.type === "body-list") {
    return `<ul class="body-list">${item.items.map((listItem) => `<li>${escapeHtml(listItem)}</li>`).join("")}</ul>`;
  }
  if (item.type === "proof-heading") {
    return `<section class="proof"><p class="proof-label">Selected Proof</p></section>`;
  }
  if (item.type === "proof-item") {
    return `<div class="proof-item${item.isLast ? " last" : ""}"><span style="color:${accentColor}">${String(item.index + 1).padStart(2, "0")}</span><p>${escapeHtml(item.text)}</p></div>`;
  }
  if (item.type === "signoff") {
    return `<section class="signoff">${item.closing ? `<p>${escapeHtml(item.closing)}</p>` : ""}<p class="signature">${escapeHtml(item.signature)}</p></section>`;
  }

  return `<p class="postscript">P.S. ${escapeHtml(item.text)}</p>`;
}

export function VeriworklyCoverLetterPreview({ content }: { content: CoverLetterContent }) {
  const state = getCoverLetterState(content, { firstPage: 15, nextPage: 23 });

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
  const flowSenderName = getCoverLetterFlowSenderName(content);
  const showTarget = isCoverLetterSectionVisible(content, "target");
  const flowContent = useMemo(() => buildCoverLetterFlowContent(content), [content]);
  const flowItems = useMemo(
    () => buildVeriworklyFlowItems(flowContent, flowSenderName),
    [flowContent, flowSenderName],
  );
  const [pages, setPages] = useState<VeriworklyFlowItem[][]>(() => [flowItems]);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const firstPrefixRef = useRef<HTMLDivElement | null>(null);
  const nextPrefixRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const probe = document.createElement("article");

      probe.className =
        "mx-auto grid h-280.75 w-198.5 max-w-full grid-cols-[214px_1fr] overflow-hidden text-[#111827]";
      Object.assign(probe.style, {
        backgroundColor: appearance.pageColor,
        color: appearance.textColor,
        fontFamily,
      });

      const aside = document.createElement("aside");
      aside.className = "h-280.75";
      probe.appendChild(aside);

      const main = document.createElement("main");
      main.className = "h-280.75 bg-white";
      main.style.padding = `${appearance.pageMargin}px`;
      probe.appendChild(main);
      measureRef.current?.appendChild(probe);

      const fitsPage = (items: VeriworklyFlowItem[], pageIndex: number) => {
        main.innerHTML = "";

        const prefix = pageIndex === 0 ? firstPrefixRef.current : nextPrefixRef.current;
        if (prefix) main.appendChild(prefix.cloneNode(true));

        const body = document.createElement("section");
        body.className = "mt-8 text-[14.5px] text-slate-700";
        body.style.lineHeight = String(appearance.lineHeight);
        body.style.setProperty("--paragraph-gap", `${appearance.paragraphSpacing}px`);

        items.forEach((item) => {
          const node = itemRefs.current.get(item.id);
          if (node) body.appendChild(node.cloneNode(true));
        });

        main.appendChild(body);

        return main.scrollHeight <= PAGE_HEIGHT + 1 && fitsInsideBottomPadding(main, body);
      };

      const nextPages = paginateMeasuredItems(
        flowItems,
        fitsPage,
        keepVeriworklyProofHeadingWithNext,
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
    appearance.lineHeight,
    appearance.pageColor,
    appearance.pageMargin,
    appearance.paragraphSpacing,
    appearance.textColor,
    flowItems,
    fontFamily,
  ]);

  function renderSidebar() {
    return (
      <aside
        className="flex h-280.75 flex-col border-r border-slate-200 px-6 py-9 text-slate-950"
        style={{ backgroundColor: appearance.sidebarColor }}
      >
        <div>
          <p
            style={{ color: appearance.accentColor }}
            className="text-[10px] font-bold tracking-[0.2em] uppercase"
          >
            Candidate
          </p>

          <h1 className="mt-4 text-[26px] leading-[1.08] font-semibold tracking-normal text-slate-950">
            {senderName}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">{senderTitle}</p>
        </div>

        <div className="my-8 h-px w-12" style={{ backgroundColor: appearance.accentColor }} />

        <div className="space-y-2 text-xs leading-5 text-slate-600">
          {contact.map((item) => (
            <p key={item}>{item}</p>
          ))}

          {renderedLinks && renderedLinks.length > 0 && (
            <div className="my-6 h-px w-12" style={{ backgroundColor: appearance.accentColor }} />
          )}

          {renderedLinks.map((link) => (
            <a
              key={link.id}
              href={normalizeLinkHref(link.url)}
              style={{ color: appearance.accentColor }}
              className="flex items-center gap-1 font-medium underline decoration-slate-300"
            >
              {linkDisplayMode !== "url" && (
                <img
                  alt=""
                  aria-hidden="true"
                  className="size-3.5 shrink-0"
                  src={SOCIAL_ICON_SRC_BY_TYPE[link.type] || SOCIAL_ICON_SRC_BY_TYPE.custom}
                />
              )}

              {linkDisplayMode !== "icon" && getLinkDisplayText(link, linkDisplayMode)}
            </a>
          ))}
        </div>

        <div className="mt-auto border-t border-slate-200 pt-7">
          <p
            style={{ color: appearance.accentColor }}
            className="text-[10px] font-bold tracking-[0.2em] uppercase"
          >
            Target
          </p>

          {showTarget ? (
            <>
              <p className="mt-2 text-sm leading-5 font-semibold text-slate-950">
                {content.jobTitle || content.subject || "Open role"}
              </p>

              {content.companyName ? (
                <p className="mt-1 text-xs leading-5 text-slate-600">{content.companyName}</p>
              ) : null}
            </>
          ) : null}
        </div>
      </aside>
    );
  }

  return (
    <div className="grid gap-6">
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none absolute opacity-0"
        style={{ left: -10000, top: 0, width: 794 }}
      >
        <article
          className="grid h-280.75 w-198.5 grid-cols-[214px_1fr] overflow-hidden text-[#111827]"
          style={{
            backgroundColor: appearance.pageColor,
            color: appearance.textColor,
            fontFamily,
          }}
        >
          {renderSidebar()}

          <main className="h-280.75 bg-white" style={{ padding: appearance.pageMargin }}>
            <div ref={firstPrefixRef}>
              <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-7">
                <div className="space-y-1 text-sm leading-5 text-slate-600">
                  {recipient.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>

                {content.date ? (
                  <p className="shrink-0 text-right text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                    {content.date}
                  </p>
                ) : null}
              </div>

              {showTarget ? (
                <section
                  className="mt-8 border-l-2 pl-5"
                  style={{ borderLeftColor: appearance.accentColor }}
                >
                  <p
                    className="text-[10px] font-bold tracking-[0.2em] uppercase"
                    style={{ color: appearance.accentColor }}
                  >
                    Cover Letter
                  </p>

                  <h2 className="mt-2 text-[22px] leading-snug font-semibold tracking-normal text-[#0f172a]">
                    {content.subject || content.jobTitle || "Application"}
                  </h2>
                </section>
              ) : null}
            </div>

            <div ref={nextPrefixRef}></div>

            <section
              className="mt-8 text-[14.5px] text-slate-700"
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
            </section>
          </main>
        </article>
      </div>

      {pages.map((pageBlocks, pageIndex) => (
        <article
          key={pageIndex}
          style={{
            backgroundColor: appearance.pageColor,
            color: appearance.textColor,
            fontFamily,
          }}
          className="mx-auto grid h-280.75 w-198.5 max-w-full grid-cols-[214px_1fr] overflow-hidden text-[#111827] shadow-sm ring-1 ring-zinc-200"
        >
          {renderSidebar()}

          <main className="h-280.75 bg-white" style={{ padding: appearance.pageMargin }}>
            {pageIndex === 0 ? (
              <>
                <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-7">
                  <div className="space-y-1 text-sm leading-5 text-slate-600">
                    {recipient.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>

                  {content.date ? (
                    <p className="shrink-0 text-right text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                      {content.date}
                    </p>
                  ) : null}
                </div>

                {showTarget ? (
                  <section
                    className="mt-8 border-l-2 pl-5"
                    style={{ borderLeftColor: appearance.accentColor }}
                  >
                    <p
                      className="text-[10px] font-bold tracking-[0.2em] uppercase"
                      style={{ color: appearance.accentColor }}
                    >
                      Cover Letter
                    </p>

                    <h2 className="mt-2 text-[22px] leading-snug font-semibold tracking-normal text-[#0f172a]">
                      {content.subject || content.jobTitle || "Application"}
                    </h2>
                  </section>
                ) : null}
              </>
            ) : null}

            <section
              className="mt-8 text-[14.5px] text-slate-700"
              style={{
                lineHeight: appearance.lineHeight,
                ["--paragraph-gap" as string]: `${appearance.paragraphSpacing}px`,
              }}
            >
              {renderGroupedFlowItems(pageBlocks, appearance.accentColor)}
            </section>
          </main>
        </article>
      ))}
    </div>
  );
}

export function buildVeriworklyCoverLetterHtml(content: CoverLetterContent): string {
  const state = getCoverLetterState(content, { firstPage: 15, nextPage: 23 });
  const {
    appearance,
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
  const flowItems = buildVeriworklyFlowItems(buildCoverLetterFlowContent(content), senderName);
  const pages = paginateVeriworklyHtmlItems(flowItems);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(content.senderName || "Cover Letter")}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${escapeHtml(fontHref)}"><style>
*{box-sizing:border-box}body{margin:0;padding:32px 16px;background:#f4f4f5;color:${appearance.textColor};font-family:${fontFamily}}.page{width:794px;height:1123px;margin:0 auto 24px;overflow:hidden;background:${appearance.pageColor};color:${appearance.textColor};box-shadow:0 0 0 1px #e4e4e7;page-break-after:always}.page:last-child{page-break-after:auto}p{margin:0 0 ${appearance.paragraphSpacing}px;line-height:${appearance.lineHeight}}.label{color:${appearance.accentColor};font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase}.body{margin-top:32px;font-size:14.5px}.body-list{background:#f4f4f5;margin:16px 0;padding:14px 18px 14px 28px;line-height:${appearance.lineHeight}}.proof{border-top:1px solid #e2e8f0;margin-top:32px;padding-top:24px}.proof-label{color:#64748b;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}.proof+.proof-item{margin-top:16px}.proof-item{display:grid;grid-template-columns:28px 1fr;gap:12px;border-bottom:1px solid #f1f5f9;padding:0 0 8px;margin-bottom:8px}.proof-item.last{border-bottom:0}.proof-item span{font-size:12px;font-weight:700;line-height:20px}.proof-item p{font-size:14px;color:#334155;line-height:1.45}.signoff{margin-top:32px}.signature{font-size:16px;font-weight:700;color:#0f172a}.postscript{border-top:1px solid #e4e4e7;padding-top:14px;color:#52525b}.veri-page{display:grid;grid-template-columns:214px 1fr}.veri-page aside{background:${appearance.sidebarColor};color:#0f172a;border-right:1px solid #e2e8f0;padding:36px 28px;display:flex;flex-direction:column}.veri-page h1{margin:16px 0 0;font-size:26px;line-height:1.08}.veri-page .muted,.veri-page .rail,.veri-page .target p{color:#475569}.veri-page .rule{width:48px;height:1px;background:${appearance.accentColor};margin-top:40px}.veri-page .rail{margin-top:32px;font-size:12px}.veri-page .rail a{display:block;color:${appearance.accentColor};font-weight:600;text-underline-offset:4px}.veri-page .target{border-top:1px solid #e2e8f0;margin-top:auto;padding-top:28px}.veri-page main{padding:${appearance.pageMargin}px;background:#fff}.veri-page .meta{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #e2e8f0;padding-bottom:28px;color:#475569}.veri-page .subject{border-left:2px solid ${appearance.accentColor};margin-top:32px;padding:4px 0 4px 20px}.veri-page h2{margin:8px 0 0;font-size:22px}@media print{body{padding:0;background:white}.page{box-shadow:none;margin:0}}</style></head><body>${pages
    .map((blocks, pageIndex) => {
      const first = pageIndex === 0;
      const body = blocks
        .map((item) => renderVeriworklyHtmlItem(item, appearance.accentColor))
        .join("");
      return `<article class="page veri-page"><aside><p class="label">Candidate</p><h1>${escapeHtml(senderName)}</h1><p class="muted">${escapeHtml(senderTitle)}</p><div class="rule"></div><div class="rail">${contact.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}${renderedLinks.map((link) => `<a href="${escapeHtml(normalizeLinkHref(link.url))}">${escapeHtml(getLinkDisplayText(link, linkDisplayMode))}</a>`).join("")}</div>${showTarget ? `<div class="target"><p class="label">Target</p><strong>${subject}</strong><p>${escapeHtml(content.companyName)}</p></div>` : ""}</aside><main>${first ? `<div class="meta"><div>${recipient.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div><p>${escapeHtml(content.date)}</p></div>${showTarget ? `<section class="subject"><p class="label">Cover Letter</p><h2>${subject}</h2></section>` : ""}` : ""}<section class="body">${body}</section></main></article>`;
    })
    .join("")}</body></html>`;
}
