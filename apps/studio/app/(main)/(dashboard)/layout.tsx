import type { ReactNode } from "react";

import StudioShell from "@/components/dashboard/StudioShell";

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return <StudioShell>{children}</StudioShell>;
};

export default DashboardLayout;
