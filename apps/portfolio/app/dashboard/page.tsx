import type { Metadata } from "next";
import { DashboardWorkspace } from "@/components/DashboardWorkspace";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };
export default function DashboardPage() {
  return <DashboardWorkspace />;
}
