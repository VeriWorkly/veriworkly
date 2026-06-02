import type { Metadata } from "next";
import { BillingWorkspace } from "@/components/BillingWorkspace";

export const metadata: Metadata = {
  title: "Portfolio Pro billing",
  robots: { index: false, follow: false },
};
export default function BillingPage() {
  return <BillingWorkspace />;
}
