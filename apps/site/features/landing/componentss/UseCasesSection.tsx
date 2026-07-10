const UseCasesSection = () => {
  const useCases = [
    {
      title: "Entry-Level Job Seekers",
      description:
        "Create your first professional resume & cover letter with guided sections and clean templates.",
    },

    {
      title: "Career Switchers",
      description:
        "Highlight transferable skills and tailor your documents and portfolio for different industries.",
    },

    {
      title: "Job Hunters",
      description:
        "Maintain multiple tailored resumes and cover letters for different positions and companies.",
    },

    {
      title: "Freelancers & Consultants",
      description:
        "Showcase projects and services with visual templates, and publish a live web portfolio.",
    },

    {
      title: "Academic Researchers",
      description: "Include publications, certifications, and research work in dedicated sections.",
    },

    {
      title: "International Professionals",
      description: "Add language proficiency levels and international experience documentation.",
    },
  ];

  return (
    <section className="space-y-8" aria-labelledby="usecases-heading">
      <div className="space-y-2">
        <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">For Everyone</p>

        <h2 id="usecases-heading" className="text-foreground text-3xl font-semibold tracking-tight">
          Perfect for any career and job type
        </h2>

        <p className="text-muted -mt-1 text-base leading-7">
          Whether you&apos;re just starting out or an experienced professional, build documents and
          portfolios tailored to your career stage and goals.
        </p>

        <p className="sr-only">
          Document and portfolio builder for freshers, students, professionals, freelancers, and
          career switchers.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {useCases.map((useCase) => (
          <div
            key={useCase.title}
            className="border-border bg-card hover:bg-card/80 space-y-2 rounded-lg border p-6 transition-colors"
          >
            <h3 className="text-foreground font-semibold">{useCase.title}</h3>
            <p className="text-muted text-sm leading-6">{useCase.description}</p>
          </div>
        ))}
      </div>

      <p className="sr-only">
        Resume, cover letter, and portfolio builder for job seekers, freelancers, and professionals.
      </p>
    </section>
  );
};

export default UseCasesSection;
