import { cn } from "@/lib/utils";

interface Feature {
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    title: "Master Profile + Derived Resumes",
    description: "Edit once, propagate selected changes automatically.",
  },
  {
    title: "Share Links with Controls",
    description: "Expiry, password protection, and view-only modes.",
  },
  {
    title: "Per-Resume Sync Toggle",
    description: "Cloud sync stays opt-in, disabled by default.",
  },
];

interface LoginFeaturesProps {
  variant?: "sidebar" | "compact";
  className?: string;
}

export const LoginFeatures = ({ variant = "compact", className }: LoginFeaturesProps) => {
  if (variant === "sidebar") {
    return (
      <div className={cn("space-y-3", className)}>
        {features.map((feature) => (
          <div
            key={feature.title}
            className="border-border/80 bg-background/70 rounded-2xl border p-3"
          >
            <p className="text-foreground text-sm font-semibold">{feature.title}</p>
            <p className="text-muted mt-1 text-sm">{feature.description}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-border/80 bg-background/65 rounded-2xl border p-3 backdrop-blur",
        className,
      )}
    >
      <ul className="text-muted text-sm leading-6">
        {features.map((feature, index) => (
          <li key={feature.title}>
            {index + 1}. {feature.title}
          </li>
        ))}
      </ul>
    </div>
  );
};
