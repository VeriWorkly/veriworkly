import * as React from "react";

import Navbar from "./Navbar";
import Footer from "./Footer";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="surface-grid flex min-h-screen flex-col">
      {/*
       * Without this, keyboard users tab through the entire navbar on every page.
       * Visually hidden until focused, which is the standard pattern for WCAG 2.4.1.
       */}
      <a
        href="#main-content"
        className="bg-card text-foreground border-border focus:ring-accent sr-only rounded-md border px-4 py-2 text-sm font-semibold focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:ring-2 focus:outline-none"
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main-content" tabIndex={-1} className="flex-1 pt-20">
        {children}
      </main>

      <Footer />
    </div>
  );
};
