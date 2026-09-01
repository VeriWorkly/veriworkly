export const PIPELINE_STEPS = [
  {
    step: "01",
    phase: "Upload",
    title: "Document converted to raw plain text",
    body: "A PDF is a series of vector drawing coordinates, not plain text. Extraction algorithms rebuild reading order, which is why multi-column layouts, graphics, and text boxes get scrambled.",
  },
  {
    step: "02",
    phase: "Extract",
    title: "Fields mapped into structured database rows",
    body: "Candidate name, phone, email, job titles, companies, and employment dates are parsed into columns. Anything unmapped remains invisible in recruiter dashboards.",
  },
  {
    step: "03",
    phase: "Search",
    title: "Recruiter search filters and keyword queries",
    body: "Hiring managers filter candidates by required skills, titles, and exact keyword matches. If a skill was placed in an image or unusual phrase, it will not appear in the index.",
  },
  {
    step: "04",
    phase: "Review",
    title: "Human recruiter evaluates shortlisted files",
    body: "Once you pass the initial search filter, the human recruiter reviews your original PDF format. Both the parsed text stream and the visual PDF must hold up cleanly.",
  },
] as const;
