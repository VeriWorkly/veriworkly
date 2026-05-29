"use client";

import type { CoverLetterContent } from "@/features/cover-letter/types";

function cleanMarkdown(value: string): string {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/, "")
    .trim();
}

function isBullet(line: string) {
  return /^[-*]\s+/.test(line.trim());
}

function splitBlocks(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function splitContact(value: string) {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseCoverLetterMarkdown(
  markdown: string,
  currentContent: CoverLetterContent,
): CoverLetterContent {
  const blocks = splitBlocks(markdown);
  const [nameBlock = "", contactBlock = "", dateBlock = "", recipientBlock = "", ...letterBlocks] =
    blocks;

  const contact = splitContact(contactBlock);
  const subjectIndex = letterBlocks.findIndex((block) =>
    cleanMarkdown(block).toLowerCase().startsWith("subject:"),
  );

  const subject =
    subjectIndex >= 0
      ? cleanMarkdown(letterBlocks.splice(subjectIndex, 1)[0]).replace(/^Subject:\s*/i, "")
      : currentContent.subject;

  const greetingIndex = letterBlocks.findIndex(
    (block) => /,$/.test(block) && /^Dear\s+/i.test(block),
  );
  const greeting =
    greetingIndex >= 0
      ? cleanMarkdown(letterBlocks.splice(greetingIndex, 1)[0])
      : currentContent.greeting;

  const signatureIndex = letterBlocks.findIndex((block) => {
    const clean = cleanMarkdown(block);
    return clean === cleanMarkdown(nameBlock) || clean === currentContent.signature;
  });

  const tailBlocks = signatureIndex >= 0 ? letterBlocks.splice(signatureIndex) : [];
  const signature = tailBlocks[0] ? cleanMarkdown(tailBlocks[0]) : cleanMarkdown(nameBlock);
  const postscriptBlock = tailBlocks.find((block) => /^P\.?S\.?\s+/i.test(block));
  const postscript = postscriptBlock
    ? cleanMarkdown(postscriptBlock).replace(/^P\.?S\.?\s*/i, "")
    : currentContent.postscript;

  const closing =
    signatureIndex > 0
      ? cleanMarkdown(letterBlocks.splice(signatureIndex - 1, 1)[0])
      : currentContent.closing;
  const highlightBlocks = letterBlocks.filter((block) => block.split(/\r?\n/).some(isBullet));
  const highlights = highlightBlocks
    .flatMap((block) => block.split(/\r?\n/))
    .filter(isBullet)
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean)
    .map((line) => `- ${line}`)
    .join("\n");

  const proseBlocks = letterBlocks.filter((block) => !block.split(/\r?\n/).some(isBullet));
  const opening = proseBlocks[0] ? cleanMarkdown(proseBlocks[0]) : currentContent.opening;
  const body = proseBlocks.slice(1).map(cleanMarkdown).filter(Boolean).join("\n\n");

  const recipientLines = recipientBlock.split(/\r?\n/).map(cleanMarkdown).filter(Boolean);

  return {
    ...currentContent,
    senderName: cleanMarkdown(nameBlock) || currentContent.senderName,
    senderTitle: contact[0] ?? currentContent.senderTitle,
    senderEmail: contact[1] ?? currentContent.senderEmail,
    senderPhone: contact[2] ?? currentContent.senderPhone,
    senderLocation: contact[3] ?? currentContent.senderLocation,
    senderWebsite: contact[4] ?? currentContent.senderWebsite,
    date: cleanMarkdown(dateBlock) || currentContent.date,
    recipientName: recipientLines[0] ?? currentContent.recipientName,
    recipientTitle: recipientLines[1] ?? currentContent.recipientTitle,
    companyName: recipientLines[2] ?? currentContent.companyName,
    companyLocation: recipientLines[3] ?? currentContent.companyLocation,
    subject,
    greeting,
    opening,
    body: body || currentContent.body,
    highlights: highlights || currentContent.highlights,
    closing,
    signature,
    postscript,
  };
}

export async function importCoverLetterMarkdownFile(
  file: File,
  currentContent: CoverLetterContent,
) {
  const markdown = await file.text();

  if (!markdown.trim()) {
    throw new Error("Invalid cover letter markdown");
  }

  return parseCoverLetterMarkdown(markdown, currentContent);
}
