import type { Metadata } from "next";

import OverviewHome from "./components/OverviewHome";

export const metadata: Metadata = {
  title: "Overview",
  description: "Studio overview for recent work and document actions.",
  robots: { index: false, follow: false },
};

const StudioDashboardHomePage = () => {
  return <OverviewHome />;
};

export default StudioDashboardHomePage;
