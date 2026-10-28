import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import type { DocumentDateFormat } from "@/features/documents/utils/formatters";

import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import { defaultResume } from "@/features/resume/constants/default-resume";

/**
 * Documents the parity harness renders through both engines.
 *
 * `default` is the shipped sample. The rest exist because the shipped sample
 * exercises none of the cases where a browser's line breaker and textkit are
 * most likely to disagree: a name long enough to wrap, a URL with no break
 * opportunity, a bullet list dense enough to cross a page boundary, a script
 * with no spaces at all, and blocks taller than a page, which both engines must
 * flow across pages rather than clip.
 *
 * The rest pin settings that change what prints without changing much content: a one-page
 * resume (the share page once drew it two pages tall), each date format, section headings
 * the user renamed, custom and dated typed sections, and a right-to-left document language
 * (Latin text, because no embedded PDF family draws Arabic glyphs — see
 * `tests/contracts/font-coverage.contract.test.ts`).
 */
export type ParityFixtureId =
  | "default"
  | "short"
  | "long"
  | "dense"
  | "cjk"
  | "spill"
  | "overflow"
  | "date-mmm-yyyy"
  | "date-mm-yyyy"
  | "date-yyyy-mm"
  | "renamed"
  | "custom"
  | "rtl";

export const PARITY_FIXTURE_IDS: ParityFixtureId[] = [
  "default",
  "short",
  "long",
  "dense",
  "cjk",
  "spill",
  "overflow",
  "date-mmm-yyyy",
  "date-mm-yyyy",
  "date-yyyy-mm",
  "renamed",
  "custom",
  "rtl",
];

const clone = <T>(value: T): T => structuredClone(value);

function baseResume(): ResumeData {
  // `updatedAt` is stamped at module load and never rendered, but pinning it
  // keeps two runs of the harness byte-identical.
  return { ...clone(defaultResume), updatedAt: "2026-01-01T00:00:00.000Z" };
}

function longResume(): ResumeData {
  const resume = baseResume();

  resume.basics.fullName = "Bartholomew Maximilian Featherstonehaugh-Wolfeschlegelstein III";
  resume.basics.headline =
    "Principal Distributed Systems Architect and Head of Platform Reliability Engineering for Global Payments Infrastructure";
  resume.basics.email = "bartholomew.featherstonehaugh-wolfeschlegelstein@enterprise-example.com";
  resume.basics.location = "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch, Wales";

  resume.links.items = [
    {
      id: "link-1",
      type: "github",
      label: "GitHub",
      url: "https://github.com/bartholomew-featherstonehaugh/monorepo-platform-infrastructure-tooling",
    },
    {
      id: "link-2",
      type: "linkedin",
      label: "LinkedIn",
      url: "https://www.linkedin.com/in/bartholomew-maximilian-featherstonehaugh-wolfeschlegelstein",
    },
  ];

  resume.experience[0].company =
    "Featherstonehaugh Wolfeschlegelstein International Holdings Incorporated";
  resume.experience[0].role =
    "Principal Distributed Systems Architect and Platform Reliability Lead";
  resume.experience[0].highlights = [
    "Led the decomposition of a monolithic payments ledger into seventeen independently deployable services without a single minute of customer-visible downtime across the migration window.",
    "https://internal-documentation.enterprise-example.com/architecture/decisions/0042-ledger-decomposition-strategy",
  ];

  resume.projects[0].link =
    "https://veriworkly.com/case-studies/distributed-ledger-decomposition-strategy-and-outcomes";

  return resume;
}

function denseResume(): ResumeData {
  const resume = baseResume();

  resume.experience = Array.from({ length: 6 }, (_, index) => ({
    ...clone(defaultResume.experience[0]),
    id: `exp-${index + 1}`,
    company: `Example Systems ${index + 1}`,
    role: "Senior Software Engineer",
    startDate: `${2019 + index}-01`,
    endDate: `${2020 + index}-01`,
    current: false,
    highlights: Array.from(
      { length: 5 },
      (_, bullet) =>
        `Delivered measurable improvement number ${bullet + 1} for team ${index + 1}, reducing p99 latency and cutting infrastructure spend while keeping the public API contract stable.`,
    ),
  }));

  resume.projects = Array.from({ length: 4 }, (_, index) => ({
    ...clone(defaultResume.projects[0]),
    id: `proj-${index + 1}`,
    name: `Platform Project ${index + 1}`,
    highlights: Array.from(
      { length: 4 },
      (_, bullet) =>
        `Project ${index + 1} outcome ${bullet + 1}: shipped an incremental change that survived a full quarter in production without a rollback.`,
    ),
  }));

  return resume;
}

/**
 * A resume whose last section lands right on the page boundary.
 *
 * This is the shape that showed the two renderers disagreeing by a whole
 * section: the preview kept the Skills heading with the lines that fit and
 * carried the rest over, while the export moved the entire section to page two
 * and left a hole behind it.
 */
function spillResume(): ResumeData {
  const resume = baseResume();

  resume.experience = [
    ...resume.experience,
    {
      ...clone(defaultResume.experience[0]),
      id: "exp-2",
      company: "Northwind Systems",
      role: "Senior Software Engineer",
      startDate: "2022-03",
      endDate: "2024-12",
      current: false,
    },
  ];

  resume.skills = [
    ...resume.skills,
    { id: "skills-5", name: "Tooling", keywords: ["Docker", "Terraform", "GitHub Actions"] },
    { id: "skills-6", name: "Testing", keywords: ["Vitest", "Playwright", "Testing Library"] },
    {
      id: "skills-7",
      name: "Practices",
      keywords: ["Code review", "Pairing", "Incident response"],
    },
    { id: "skills-8", name: "Data", keywords: ["PostgreSQL", "Redis", "ClickHouse"] },
    { id: "skills-9", name: "Cloud", keywords: ["AWS", "Cloudflare", "Fly.io"] },
  ];

  return resume;
}

function cjkResume(): ResumeData {
  const resume = baseResume();

  resume.basics.fullName = "山田太郎";
  resume.basics.headline = "分散システムアーキテクト、プラットフォーム信頼性エンジニアリング責任者";
  resume.basics.location = "東京都渋谷区";
  resume.summary =
    "十年以上にわたり大規模な分散システムの設計と運用に携わってきました。可用性、遅延、コストの三点を同時に改善することを得意としています。現在は決済基盤の再設計を主導しています。";
  resume.experience[0].highlights = [
    "決済台帳のモノリスを十七の独立したサービスへ分割し、移行期間中に顧客影響のある停止を一度も発生させませんでした。",
    "観測基盤を刷新し、障害の平均検知時間を四十二分から三分へ短縮しました。",
  ];

  return resume;
}

/** A 1,500-word summary and a 60-bullet role: each is taller than a page on its own. */
function overflowResume(): ResumeData {
  const resume = baseResume();

  resume.summary = Array.from({ length: 1_500 }, (_, i) => `word${i % 97}`).join(" ");
  resume.experience[0].highlights = Array.from(
    { length: 60 },
    (_, i) => `Bullet ${i + 1}: shipped a change that moved a metric the team was measuring.`,
  );

  return resume;
}

/** Only the header, links and summary: comfortably one page on either paper. */
function shortResume(): ResumeData {
  const resume = baseResume();

  resume.sections = resume.sections.map((section) => ({
    ...section,
    visible: ["basics", "links", "summary"].includes(section.id),
  }));

  return resume;
}

/** The dense resume, so every date column and every page break is printed in `format`. */
function datedResume(format: DocumentDateFormat): () => ResumeData {
  return () => {
    const resume = denseResume();

    resume.customization = { ...resume.customization, dateFormat: format };
    resume.certificates = [
      {
        id: "cert-1",
        title: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        date: "2023-06",
        description: "",
        showLink: false,
      },
    ];

    return resume;
  };
}

/** Every heading renamed, some much longer than the default. */
function renamedResume(): ResumeData {
  const resume = spillResume();
  const labels: Partial<Record<string, string>> = {
    summary: "Professional Profile",
    experience: "Selected Engineering Leadership and Delivery Experience",
    education: "Academic Background",
    projects: "Things I Built",
    skills: "Toolbox",
  };

  resume.sections = resume.sections.map((section) => ({
    ...section,
    label: labels[section.id] ?? section.label,
  }));

  return resume;
}

/** Two user-invented sections plus dated typed ones, ordered among the built-in sections. */
function customResume(): ResumeData {
  const resume = baseResume();
  const item = (id: string, name: string, details: string[]) => ({
    id,
    name,
    issuer: "Open Source Foundation",
    date: "2024-05",
    link: "",
    referenceId: "",
    description: `${name}: a short description that runs onto a second line in the narrower templates.`,
    details,
  });

  resume.customSections = [
    {
      id: "custom-talks",
      kind: "custom",
      title: "Talks",
      items: [
        item("talk-1", "Local-first editors at scale", ["Conference keynote", "Recorded"]),
        item("talk-2", "Shipping accessible PDFs", ["Meetup talk"]),
      ],
    },
    {
      id: "custom-mentoring",
      kind: "custom",
      title: "Mentoring",
      items: [item("mentor-1", "Engineering mentor", ["Weekly sessions", "Career planning"])],
    },
  ];

  resume.awards = [
    {
      id: "award-1",
      title: "Engineering Excellence Award",
      awarder: "Acme Corp",
      date: "2023-11",
      description: "For the local-first storage migration.",
      showLink: false,
    },
  ];

  resume.certificates = [
    {
      id: "cert-1",
      title: "Certified Kubernetes Application Developer",
      issuer: "CNCF",
      date: "2022-08",
      description: "",
      showLink: false,
    },
  ];

  resume.sections = [
    ...resume.sections
      .filter((section) => section.id !== "custom")
      .map((section) => (section.order > 4 ? { ...section, order: section.order + 1 } : section)),
    { id: "custom", label: "Talks", visible: true, order: 5, customSectionId: "custom-talks" },
    {
      id: "custom",
      label: "Mentoring",
      visible: true,
      order: 20,
      customSectionId: "custom-mentoring",
    },
  ];

  return resume;
}

/** A right-to-left document language. Only the exports' `lang`/`dir` read it. */
function rtlResume(): ResumeData {
  return { ...spillResume(), language: "ar" };
}

export const PARITY_FIXTURES: Record<
  ParityFixtureId,
  { resume: () => ResumeData; coverLetter: () => CoverLetterContent }
> = {
  default: {
    resume: baseResume,
    coverLetter: () => coverLetterContent(),
  },
  long: {
    resume: longResume,
    coverLetter: () =>
      coverLetterContent({
        senderName: "Bartholomew Maximilian Featherstonehaugh-Wolfeschlegelstein III",
        senderTitle: "Principal Distributed Systems Architect and Platform Reliability Lead",
        senderEmail: "bartholomew.featherstonehaugh-wolfeschlegelstein@enterprise-example.com",
        senderWebsite:
          "https://enterprise-example.com/people/bartholomew-featherstonehaugh-wolfeschlegelstein",
        subject:
          "Application for the Principal Distributed Systems Architect and Platform Reliability Lead position at Veriworkly",
      }),
  },
  dense: {
    resume: denseResume,
    coverLetter: () =>
      coverLetterContent({
        body: Array.from(
          { length: 8 },
          (_, index) =>
            `Paragraph ${index + 1}. I would bring a practical product engineering mindset to this team, and I care about the details that decide whether a document editor feels dependable: autosave behaviour, hydration-safe rendering, and templates that start people off with strong defaults.`,
        ).join("\n\n"),
        highlights: Array.from(
          { length: 8 },
          (_, index) =>
            `- Highlight ${index + 1}: shipped a change that survived a full quarter in production without a rollback`,
        ).join("\n"),
      }),
  },
  short: {
    resume: shortResume,
    coverLetter: () =>
      coverLetterContent({
        body: "I would bring a practical product engineering mindset to this team.",
        highlights: "",
      }),
  },
  "date-mmm-yyyy": {
    resume: datedResume("MMM YYYY"),
    coverLetter: () => coverLetterContent(),
  },
  "date-mm-yyyy": {
    resume: datedResume("MM/YYYY"),
    coverLetter: () => coverLetterContent(),
  },
  "date-yyyy-mm": {
    resume: datedResume("YYYY-MM"),
    coverLetter: () => coverLetterContent(),
  },
  renamed: {
    resume: renamedResume,
    coverLetter: () => coverLetterContent(),
  },
  custom: {
    resume: customResume,
    coverLetter: () => coverLetterContent(),
  },
  rtl: {
    resume: rtlResume,
    coverLetter: () => coverLetterContent({ language: "ar" }),
  },
  spill: {
    resume: spillResume,
    coverLetter: () => coverLetterContent(),
  },
  overflow: {
    resume: overflowResume,
    coverLetter: () => coverLetterContent(),
  },
  cjk: {
    resume: cjkResume,
    coverLetter: () =>
      coverLetterContent({
        senderName: "山田太郎",
        senderTitle: "プロダクトエンジニア",
        greeting: "採用ご担当者様",
        opening:
          "このたびはプロダクトエンジニアの募集に応募いたします。貴社の製品が目指す方向性は、私がこれまで大切にしてきた仕事の進め方と重なっています。",
        body: "私は書類編集ツールの設計と実装に長く携わってきました。自動保存の挙動、再描画の安全性、共有リンクの信頼性といった細部が、利用者の体験を決めると考えています。\n\n貴社の製品は利用者に見える丁寧さと、内部で求められる堅牢さの両方を必要とします。その両立に貢献したいと考えています。",
        signature: "山田太郎",
      }),
  },
};

function coverLetterContent(overrides: Partial<CoverLetterContent> = {}): CoverLetterContent {
  const content = clone(createDefaultCoverLetter("parity").content) as CoverLetterContent;

  // The default fixture stamps today's date, which would make two runs of the
  // harness disagree on the width of the date column.
  content.date = "January 1, 2026";

  return { ...content, ...overrides };
}
