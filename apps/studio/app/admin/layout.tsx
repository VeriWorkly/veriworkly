import type { ReactNode } from "react";
import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";

import { AuthInitializer } from "@/providers/auth-provider";
import AdminOutage from "@/components/admin/AdminOutage";
import AdminShell from "@/components/admin/shell/AdminShell";
import ChartDefs from "@/components/admin/charts/ChartDefs";
import { fetchAdminActionQueue, requireAdminUser } from "@/features/admin/services/admin-server";

export const metadata: Metadata = {
  title: "Admin",
  description: "VeriWorkly admin operations and roadmap management.",
  robots: { index: false, follow: false },
};

const AdminLayout = async ({ children }: { children: ReactNode }) => {
  // Fails closed (404) for any non-admin session — the backend independently re-enforces this
  // on every admin API call, but the frontend must not rely on that alone. Pages are gated too:
  // every admin read awaits the same cached check (see requireAdminUser's doc comment). A
  // failure here is above `app/admin/error.tsx`, so an outage is answered here: the root
  // `app/error.tsx` would call it a workspace error. The 404 and the sign-in redirect pass on.
  let admin: Awaited<ReturnType<typeof requireAdminUser>>;

  try {
    admin = await requireAdminUser();
  } catch (error) {
    unstable_rethrow(error);
    console.error("Admin session check failed", error);

    return <AdminOutage />;
  }

  // Drives the sidebar's queue badges. This layout is not re-run on client navigations inside
  // `/admin`, so the counts refresh with `router.refresh()`. An unreadable count is "—", never 0.
  const queue = await fetchAdminActionQueue();

  return (
    <AdminShell adminEmail={admin.email} queue={queue}>
      {/* Hydrates the client auth store for every admin page, not just the dashboard. */}
      <AuthInitializer initialUser={admin} />

      {/* Chart gradients, declared once here so no chart needs `useId` to own one. */}
      <ChartDefs />

      {children}
    </AdminShell>
  );
};

export default AdminLayout;
