import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard Redirect",
  description: "Legacy dashboard route redirect.",
  robots: { index: false, follow: false },
};

const DashboardRouteCompatibilityPage = () => {
  redirect("/");
};

export default DashboardRouteCompatibilityPage;
