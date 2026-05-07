import type { Metadata } from "next";

import DashboardWorkspace from "./components/DashboardWorkspace";

export const metadata: Metadata = {
  title: `Dashboard`,
  description: "Manage your resumes, edit drafts, and export professional documents in seconds.",
  robots: { index: false, follow: false },
};

const DashboardPage = () => {
  return <DashboardWorkspace />;
};

export default DashboardPage;
