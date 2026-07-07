"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/95 group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl group-[.toaster]:backdrop-blur-md group-[.toaster]:rounded-2xl group-[.toaster]:p-4",
          description: "group-[.toast]:text-muted group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-accent group-[.toast]:text-accent-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error:
            "group-[.toaster]:border-red-500/50 group-[.toaster]:bg-red-500/5 dark:group-[.toaster]:bg-red-500/10",
          success:
            "group-[.toaster]:border-emerald-500/50 group-[.toaster]:bg-emerald-500/5 dark:group-[.toaster]:bg-emerald-500/10",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
