import type { Metadata } from "next";
import { PortfolioSettingsWorkspace } from "@/components/dashboard/settings/PortfolioSettingsWorkspace";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };
export default function SettingsPage() {
  return <PortfolioSettingsWorkspace />;
}
