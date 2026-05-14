"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun, LucideIcon, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { Badge } from "@veriworkly/ui";

type ThemeChoice = "light" | "dark" | "system";

interface ThemeOption {
  key: ThemeChoice;
  label: string;
  icon: LucideIcon;
  description: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { key: "light", label: "Light", icon: Sun, description: "Maximum clarity" },
  { key: "dark", label: "Dark", icon: Moon, description: "Anti-glare focus" },
  {
    key: "system",
    label: "System",
    icon: Monitor,
    description: "Adaptive sync",
  },
];

export default function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);

    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return <div className="bg-muted/10 h-48 w-full animate-pulse rounded-3xl" />;

  const currentTheme = theme;

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Sun className="text-accent h-5 w-5" /> Visual Interface
        </h2>

        <p className="text-muted-foreground text-sm">Select your preferred workspace theme.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {THEME_OPTIONS.map((opt) => {
          const isActive = currentTheme === opt.key;
          const Icon = opt.icon;

          return (
            <button
              key={opt.key}
              onClick={() => setTheme(opt.key)}
              className={cn(
                "group relative flex cursor-pointer flex-col rounded-3xl border-2 p-5 text-left transition-all duration-300 active:scale-[0.97]",
                isActive
                  ? "border-accent bg-accent/3 shadow-accent/10 shadow-xl"
                  : "border-border hover:border-accent/40 hover:bg-accent/1 hover:-translate-y-1",
              )}
            >
              <div
                className={cn(
                  "mb-4 w-fit rounded-xl p-3 transition-all duration-500 group-hover:scale-110",
                  isActive
                    ? "bg-accent shadow-accent/20 text-white shadow-lg"
                    : "bg-background text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="space-y-1">
                <span className="text-foreground text-sm font-bold tracking-tight">
                  {opt.label}
                </span>

                <p className="text-muted-foreground/60 text-[10px] leading-tight tracking-widest uppercase">
                  {opt.description}
                </p>
              </div>

              {isActive && (
                <div className="animate-in fade-in zoom-in absolute top-4 right-4 duration-300">
                  <Badge className="bg-accent flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold text-white">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Active
                  </Badge>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
