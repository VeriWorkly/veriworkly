import type { ReactNode } from "react";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AuthInitializer, InitialUserProvider } from "@/providers/auth-provider";

import { REQUEST_PATH_HEADER, sessionExpiredPath } from "@/lib/auth-redirect";
import { hasSessionCookie } from "@/lib/server-fetch";
import { fetchCurrentUser } from "@/features/auth/services/current-user";

const MainLayout = async ({ children }: { children: ReactNode }) => {
  // Throws on an outage, so the error boundary explains it rather than showing a guest studio.
  const user = await fetchCurrentUser();

  // A session cookie the API rejected: clear it and sign in again, then come back here.
  if (!user && (await hasSessionCookie())) {
    redirect(sessionExpiredPath((await headers()).get(REQUEST_PATH_HEADER)));
  }

  return (
    <InitialUserProvider user={user}>
      <AuthInitializer initialUser={user} />
      {children}
    </InitialUserProvider>
  );
};

export default MainLayout;
