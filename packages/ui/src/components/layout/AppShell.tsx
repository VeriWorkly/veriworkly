import * as React from "react";

import { cn } from "../../utils";

interface AppShellProps {
  children: React.ReactNode;
  navbar?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  mainClassName?: string;
}

export const AppShell = ({ children, navbar, footer, className, mainClassName }: AppShellProps) => {
  return (
    <div className={cn("flex min-h-screen flex-col", className)}>
      {navbar}
      <main className={cn("flex-1", mainClassName)}>{children}</main>
      {footer}
    </div>
  );
};
