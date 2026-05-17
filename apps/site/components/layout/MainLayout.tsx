import * as React from "react";

import { AppShell } from "@veriworkly/ui";

import Navbar from "./Navbar";
import Footer from "./Footer";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <AppShell navbar={<Navbar />} footer={<Footer />}>
      {children}
    </AppShell>
  );
};
