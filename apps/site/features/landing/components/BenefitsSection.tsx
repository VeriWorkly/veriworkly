import { Card } from "@veriworkly/ui";
import { Zap, Shield, Smartphone, Paintbrush, Layers, RefreshCw } from "lucide-react";

const BenefitsSection = () => {
  const benefits = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Create professional resumes in seconds with a fast, modern builder.",
    },

    {
      icon: Shield,
      title: "100% Private",
      description:
        "Your resume data stays local-first by default. No mandatory account and no data selling.",
    },

    {
      icon: Smartphone,
      title: "Works Everywhere",
      description:
        "Desktop, tablet, or mobile - your resume editing experience is seamless across all devices.",
    },

    {
      icon: Paintbrush,
      title: "Fully Customizable",
      description: "Complete control over colors, fonts, spacing, and layout. Make it truly yours.",
    },

    {
      icon: Layers,
      title: "Multiple Sections",
      description:
        "Add languages, interests, awards, certificates, publications, volunteer work, and more.",
    },

    {
      icon: RefreshCw,
      title: "Smart Sync",
      description:
        "Update your master profile once and sync across all your resumes automatically.",
    },
  ];

  return (
    <section className="space-y-8" aria-labelledby="benefits-heading">
      <div className="space-y-2">
        <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
          Why choose us
        </p>

        <h2 id="benefits-heading" className="text-foreground text-3xl font-semibold tracking-tight">
          Everything you need to build a professional resume
        </h2>

        <p className="text-muted -mt-1 text-base leading-7">
          Powerful features designed to help you create the perfect resume.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {benefits.map((benefit) => {
          const Icon = benefit.icon;

          return (
            <Card key={benefit.title} className="space-y-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="text-foreground text-lg font-semibold">{benefit.title}</h3>

              <p className="text-muted text-sm leading-6">{benefit.description}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default BenefitsSection;
