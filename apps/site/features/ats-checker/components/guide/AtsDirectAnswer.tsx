import { PageSection, TYPE } from "@/components/marketing/PageLayout";
import { BLOG_GUIDES } from "@/config/blog-guides";
import { FurtherReading } from "@/components/marketing/FurtherReading";

const ANSWERS = [
  {
    question: "What is an ATS?",
    answer:
      "An applicant tracking system is recruitment software that mid-market and enterprise employers use to collect, parse, store and filter applications so recruiters can search them before a person reviews each one.",
  },
  {
    question: "How does it read a resume?",
    answer:
      "It strips the formatting to get plain text, maps your work history into database fields, and indexes keywords so recruiters can search for you.",
  },
  {
    question: "How do you get through it?",
    answer:
      "Use one column, standard section titles (Experience, Education, Skills), concrete numbers in your achievements, and the terms the job description asks for.",
  },
];

export function AtsDirectAnswer() {
  return (
    <PageSection
      tone="card"
      title="What an ATS checker does."
      lede="The short version, before you scan: what the software is, how it reads you, and what it rewards."
    >
      <dl className="grid gap-10 md:grid-cols-3 md:gap-8">
        {ANSWERS.map((item) => (
          <div key={item.question} className="reveal">
            <dt className={`text-balance ${TYPE.title}`}>{item.question}</dt>
            <dd className="text-muted mt-3 text-base leading-7 text-pretty">{item.answer}</dd>
          </div>
        ))}
      </dl>

      <FurtherReading
        className="mt-12"
        guides={[BLOG_GUIDES.atsFormat, BLOG_GUIDES.tailoring, BLOG_GUIDES.blankPdf]}
      />
    </PageSection>
  );
}

export default AtsDirectAnswer;
