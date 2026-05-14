import type { Metadata } from "next";

import DashboardWorkspace from "./dashboard/components/DashboardWorkspace";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your resumes, edit drafts, and export professional documents in seconds.",
  robots: { index: false, follow: false },
};

const StudioDashboardHomePage = () => {
  return <DashboardWorkspace />;
};

export default StudioDashboardHomePage;
