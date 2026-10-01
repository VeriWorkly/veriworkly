import type { AtsDocumentSection, AtsResumeDocument } from "./types.js";

/**
 * The canonical plain-text form of a structured resume: the page as a reader sees it.
 *
 * One line per visual line, a heading line per section, bullets prefixed with "- ". This is the
 * text the content rules score and the text an AI pass is given, so it deliberately mirrors how
 * the document prints rather than how it is stored.
 *
 * Dates are kept in their stored `YYYY-MM` form. Rendering them as "Mar 2021" would bind the
 * output to English month names; the ISO form reads the same in every language and no rule
 * scores its spelling.
 */

/** One line: a newline inside a title field would split one header into several content lines. */
const clean = (value: string | undefined) => value?.replace(/\s+/g, " ").trim() ?? "";

function join(parts: Array<string | undefined>, separator = ", ") {
  let out = "";
  for (const part of parts) {
    const value = clean(part);
    if (value) out = out ? `${out}${separator}${value}` : value;
  }
  return out;
}

function span(start: string | undefined, end: string | undefined, current: boolean) {
  const from = clean(start);
  const to = current ? "Present" : clean(end);
  return from && to ? `${from} - ${to}` : from || to;
}

function pushBullets(lines: string[], items: string[] | undefined) {
  if (!items) return;
  for (const item of items) {
    const value = clean(item);
    if (value) lines.push(`- ${value}`);
  }
}

function pushText(lines: string[], value: string | undefined) {
  const text = value?.trim();
  if (!text) return;
  // A multi-line summary keeps its own line structure; collapsing it would merge sentences into
  // one line and understate the document's content lines.
  for (const line of text.split(/\r?\n/)) if (line.trim()) lines.push(line.trim());
}

function renderSection(section: AtsDocumentSection): string[] {
  const lines: string[] = [];

  switch (section.kind) {
    case "summary":
      pushText(lines, section.text);
      break;
    case "experience":
      for (const role of section.items) {
        const header = join([role.title, role.employer, role.location]);
        if (header) lines.push(header);
        const dates = span(role.start, role.end, Boolean(role.current));
        if (dates) lines.push(dates);
        pushText(lines, role.summary);
        pushBullets(lines, role.highlights);
      }
      break;
    case "education":
      for (const entry of section.items) {
        const line = join([
          entry.school,
          join([entry.credential, entry.field], " in "),
          span(entry.start, entry.end, Boolean(entry.current)),
        ]);
        if (line) lines.push(line);
        pushText(lines, entry.summary);
      }
      break;
    case "projects":
      for (const project of section.items) {
        const header = join([project.name, project.role, project.url]);
        if (header) lines.push(header);
        pushText(lines, project.summary);
        pushBullets(lines, project.highlights);
        if (project.skills?.length) lines.push(join(project.skills));
      }
      break;
    case "skills":
      for (const group of section.items) {
        const keywords = join(group.keywords);
        const name = clean(group.name);
        const line = name && keywords ? `${name}: ${keywords}` : name || keywords;
        if (line) lines.push(line);
      }
      break;
    case "other":
      for (const entry of section.items) {
        const heading = clean(entry.heading);
        if (heading) lines.push(heading);
        pushBullets(lines, entry.lines);
      }
      break;
  }

  return lines;
}

export function renderResumeDocument(doc: AtsResumeDocument): string {
  const { basics } = doc;
  const lines: string[] = [];

  if (clean(basics.name)) lines.push(clean(basics.name));
  if (clean(basics.headline)) lines.push(clean(basics.headline));
  const contact = join(
    [basics.email, basics.phone, basics.location, ...(basics.links ?? [])],
    " | ",
  );
  if (contact) lines.push(contact);

  for (const section of doc.sections) {
    const body = renderSection(section);
    // An empty section prints nothing on the page, so it contributes no heading either — a bare
    // "Experience" heading would otherwise satisfy the structure rule with nothing under it.
    if (!body.length) continue;
    lines.push("", ...(clean(section.title) ? [clean(section.title)] : []), ...body);
  }

  return lines.join("\n").trim();
}
