import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { AuthInitializer, InitialUserProvider } from "@/providers/auth-provider";

import { SESSION_EXPIRED_PATH } from "@/lib/auth-redirect";
import { hasSessionCookie } from "@/lib/server-fetch";
import { fetchCurrentUser } from "@/features/auth/services/current-user";

const MainLayout = async ({ children }: { children: ReactNode }) => {
  // Throws on an outage, so the error boundary explains it rather than showing a guest studio.
  const user = await fetchCurrentUser();

  // A session cookie the API rejected: clear it and sign in again.
  if (!user && (await hasSessionCookie())) redirect(SESSION_EXPIRED_PATH);

  return (
    <InitialUserProvider user={user}>
      <AuthInitializer initialUser={user} />
      {children}
    </InitialUserProvider>
  );
};

export default MainLayout;
