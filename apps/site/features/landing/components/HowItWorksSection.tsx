import { Card } from "@veriworkly/ui";

const HowItWorksSection = () => {
  const steps = [
    {
      number: "01",
      title: "Import Your Data",
      description:
        "Connect your GitHub or LinkedIn profile, or upload your old resume PDF/DOCX to extract facts instantly.",
    },
    {
      number: "02",
      title: "Choose Templates",
      description:
        "Select from our professionally designed collection of ATS-optimized resume, cover letter, or web portfolio templates.",
    },
    {
      number: "03",
      title: "Master Profile Sync",
      description:
        "Keep a single secure database of your accomplishments. Seed or update any document from one dashboard.",
    },
    {
      number: "04",
      title: "Export & Publish",
      description:
        "Download your resume and cover letter as high-fidelity PDFs, and publish your web portfolio to a custom subdomain.",
    },
  ];

  return (
    <section className="space-y-8" aria-labelledby="how-it-works-heading">
      <div className="space-y-2">
        <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Process</p>

        <h2
          id="how-it-works-heading"
          className="text-foreground text-3xl font-semibold tracking-tight"
        >
          How VeriWorkly works
        </h2>

        <p className="text-muted -mt-1 text-base leading-7">
          Start with a single Master Profile to generate resumes, cover letters, and web portfolios.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <Card key={step.number} className="flex flex-col justify-between space-y-4 p-6">
            <p className="text-accent text-2xl font-bold">{step.number}</p>
            <h3 className="text-foreground text-lg font-semibold">{step.title}</h3>
            <p className="text-muted text-sm leading-6">{step.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default HowItWorksSection;
