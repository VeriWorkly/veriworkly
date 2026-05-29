"use client";

import type {
  ResumeData,
  ResumeLinkItem,
  ResumeSkillGroup,
  ResumeProjectItem,
  ResumeEducationItem,
  ResumeExperienceItem,
} from "@/types/resume";

import { defaultResume } from "@/features/resume/constants/default-resume";
import { normalizeResumeData } from "@/features/resume/utils/normalize-data";

function createImportedResumeId(): string {
  return `resume-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneDefaultResume(): ResumeData {
  return JSON.parse(JSON.stringify(defaultResume)) as ResumeData;
}

function cleanMarkdown(value: string): string {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^_(.*)_$/g, "$1")
    .trim();
}

function parseDateRange(value: string) {
  const [startDate = "", endDate = ""] = value.split(/\s+-\s+/);
  const current = endDate.trim().toLowerCase() === "present";

  return {
    startDate: startDate.trim(),
    endDate: current ? "" : endDate.trim(),
    current,
  };
}

function splitSections(markdown: string) {
  const sections = new Map<string, string[]>();
  let current = "";

  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^##\s+(.+)$/);

    if (match) {
      current = match[1].trim().toLowerCase();
      sections.set(current, []);
      continue;
    }

    if (current) {
      sections.get(current)?.push(line);
    }
  }

  return sections;
}

function splitEntries(lines: string[]) {
  const entries: string[][] = [];
  let current: string[] = [];

  for (const line of lines.map((item) => item.trim())) {
    if (!line) continue;

    if (line.startsWith("### ")) {
      if (current.length) entries.push(current);
      current = [line.replace(/^###\s+/, "")];
      continue;
    }

    if (current.length) current.push(line);
  }

  if (current.length) entries.push(current);
  return entries;
}

function parseHeader(markdown: string, resume: ResumeData) {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const nameLine = lines.find((line) => line.startsWith("# "));
  const nameIndex = nameLine ? lines.indexOf(nameLine) : -1;

  if (nameLine) {
    resume.basics.fullName = cleanMarkdown(nameLine.replace(/^#\s+/, ""));
    resume.title = resume.basics.fullName;
  }

  const beforeSections = lines.filter((line) => !line.startsWith("## "));
  const roleLine = beforeSections.find((line, index) => index > nameIndex && /^_.+_$/.test(line));

  if (roleLine) {
    resume.basics.role = cleanMarkdown(roleLine);
  }

  const contactLine = beforeSections.find((line) => line.includes(" | ") && !line.startsWith("#"));
  const headlineLine = beforeSections.find(
    (line) =>
      line !== nameLine &&
      line !== roleLine &&
      line !== contactLine &&
      !line.startsWith("# ") &&
      !/^_.+_$/.test(line),
  );

  if (headlineLine) {
    resume.basics.headline = cleanMarkdown(headlineLine);
  }

  if (contactLine) {
    const [email = "", phone = "", location = ""] = contactLine
      .split("|")
      .map((item) => item.trim());
    resume.basics.email = email;
    resume.basics.phone = phone;
    resume.basics.location = location;
  }
}

function parseExperience(lines: string[]): ResumeExperienceItem[] {
  return splitEntries(lines).map((entry, index) => {
    const [heading = "", meta = "", ...rest] = entry;
    const [role = "Role", company = "Company"] = heading.split(/\s+-\s+/);
    const [dateRange = "", location = ""] = meta.split("|").map((item) => item.trim());
    const summaryLines: string[] = [];
    const highlights: string[] = [];

    for (const line of rest) {
      const bullet = line.match(/^[-*]\s+(.+)$/);
      if (bullet) highlights.push(cleanMarkdown(bullet[1]));
      else summaryLines.push(cleanMarkdown(line));
    }

    return {
      id: `experience-${index + 1}`,
      role: cleanMarkdown(role),
      company: cleanMarkdown(company),
      location,
      ...parseDateRange(dateRange),
      summary: summaryLines.join("\n"),
      highlights,
    };
  });
}

function parseEducation(lines: string[]): ResumeEducationItem[] {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line, index) => {
      const clean = cleanMarkdown(line.replace(/^-\s+/, ""));
      const match = clean.match(/^(.+?)\s+-\s+(.+?)(?:\s+\((.*?)\))?$/);
      const title = match?.[1] ?? clean;
      const school = match?.[2] ?? "";
      const dateRange = match?.[3] ?? "";
      const [degree = "", field = ""] = title.split(",").map((item) => item.trim());

      return {
        id: `education-${index + 1}`,
        school,
        degree,
        field,
        ...parseDateRange(dateRange),
        summary: "",
      };
    });
}

function parseProjects(lines: string[]): ResumeProjectItem[] {
  return splitEntries(lines).map((entry, index) => {
    const [heading = "", ...rest] = entry;
    const titleMatch = heading.match(/^(.+?)(?:\s+\((.*?)\))?$/);
    const highlights: string[] = [];
    const summaryLines: string[] = [];
    let link = "";

    for (const line of rest) {
      const bullet = line.match(/^[-*]\s+(.+)$/);
      if (bullet) highlights.push(cleanMarkdown(bullet[1]));
      else if (!link && /^https?:\/\//i.test(line)) link = line;
      else summaryLines.push(cleanMarkdown(line));
    }

    return {
      id: `project-${index + 1}`,
      name: cleanMarkdown(titleMatch?.[1] ?? heading),
      role: cleanMarkdown(titleMatch?.[2] ?? ""),
      link,
      linkLabel: "Link",
      showLinkAsText: true,
      summary: summaryLines.join("\n"),
      highlights,
      skills: [],
    };
  });
}

function parseSkills(lines: string[]): ResumeSkillGroup[] {
  return lines
    .map((line) => cleanMarkdown(line.replace(/^[-*]\s+/, "")))
    .filter(Boolean)
    .map((line, index) => {
      const [name = "Skills", keywords = ""] = line.split(":");

      return {
        id: `skill-${index + 1}`,
        name: name.trim(),
        keywords: keywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean),
      };
    });
}

function parseLinks(lines: string[]): ResumeLinkItem[] {
  return lines
    .map((line) => line.trim().match(/^[-*]\s+\[(.*?)\]\((.*?)\)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match, index) => ({
      id: `link-${index + 1}`,
      type: "custom",
      label: cleanMarkdown(match[1]),
      url: match[2].trim(),
    }));
}

export function parseResumeMarkdown(markdown: string, currentResume?: ResumeData): ResumeData {
  const base = cloneDefaultResume();
  const resume = normalizeResumeData({
    ...base,
    ...(currentResume
      ? {
          templateId: currentResume.templateId,
          customization: currentResume.customization,
          sections: currentResume.sections,
        }
      : {}),
    id: createImportedResumeId(),
    updatedAt: new Date().toISOString(),
  });

  parseHeader(markdown, resume);

  const sections = splitSections(markdown);
  const summary = sections.get("summary")?.map(cleanMarkdown).filter(Boolean).join("\n\n");

  if (summary) resume.summary = summary;

  const experience = parseExperience(sections.get("experience") ?? []);
  if (experience.length) resume.experience = experience;

  const education = parseEducation(sections.get("education") ?? []);
  if (education.length) resume.education = education;

  const projects = parseProjects(sections.get("projects") ?? []);
  if (projects.length) resume.projects = projects;

  const skills = parseSkills(sections.get("skills") ?? []);
  if (skills.length) resume.skills = skills;

  const links = parseLinks(sections.get("links") ?? []);
  if (links.length) resume.links = { ...resume.links, items: links };

  return normalizeResumeData(resume);
}

export async function importResumeFromMarkdownFile(file: File, currentResume?: ResumeData) {
  const markdown = await file.text();

  if (!markdown.trim()) {
    throw new Error("Invalid resume markdown");
  }

  return parseResumeMarkdown(markdown, currentResume);
}
