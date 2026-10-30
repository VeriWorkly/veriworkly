"use client";

import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield, Lock, Check } from "lucide-react";

import { Badge } from "@veriworkly/ui";

import AuthCard from "../component/AuthCard";

import { finishSignIn, rememberReferralCode, takeSocialSignInStarted } from "@/lib/sign-in";
import { getSafeAuthCallback } from "@/lib/auth-redirect";
import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

const LoginCallbackPage = () => {
  const router = useRouter();
  const processedRef = useRef(false);

  useEffect(() => {
    // Avoid double-processing in React strict mode
    if (processedRef.current) return;

    processedRef.current = true;

    async function processLogin() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const targetPath = getSafeAuthCallback(searchParams.get("callbackURL"));
        // This page is open to signed-in accounts, so only a sign-in this tab started is
        // finished here: a link to it must not attach a referral to an existing account (S-373).
        const startedHere = takeSocialSignInStarted();

        // A social sign-in leaves the site, so a code from this URL is remembered before use.
        const referralCode = searchParams.get("ref");
        if (startedHere && referralCode) rememberReferralCode(referralCode);

        // A provider can land here without a session (a refused or abandoned sign-in): say so
        // instead of announcing a sign-in that did not happen.
        await fetchApiData("/users/me", { redirectOnInvalidSession: false });

        if (!startedHere) {
          router.replace(targetPath);
          return;
        }

        const { referralError } = await finishSignIn();

        toast.success("Successfully signed in!");
        if (referralError) toast.info(`Referral not applied: ${referralError}`);

        router.push(targetPath);
        router.refresh();
      } catch (err: unknown) {
        const signedOut =
          err instanceof ApiRequestError && (err.status === 401 || err.status === 403);
        const message = signedOut
          ? "Sign-in did not complete. Please try again."
          : err instanceof Error
            ? err.message
            : "Failed to sign in.";
        toast.error(message);
        router.push("/login");
      }
    }

    void processLogin();
  }, [router]);

  return (
    <AuthCard blurPosition="bottom-right">
      <div className="space-y-3">
        <Badge className="bg-background/70">Secure Connection</Badge>

        <h1 className="text-foreground text-3xl font-semibold tracking-tight">Finishing sign-in</h1>

        <p className="text-muted max-w-md text-sm leading-relaxed md:text-base">
          Your account is ready. We are taking you back to where you were.
        </p>
      </div>

      <div className="my-auto flex flex-1 flex-col items-center justify-center space-y-6 py-8">
        <div className="relative flex items-center justify-center">
          <div className="bg-accent/25 absolute h-24 w-24 animate-ping rounded-full opacity-60 blur-xl" />
          <div className="bg-accent/15 absolute h-20 w-20 animate-pulse rounded-full blur-lg" />

          <div className="border-border bg-card/65 relative flex h-20 w-20 items-center justify-center rounded-3xl border shadow-xl backdrop-blur-md">
            <Loader2 className="text-accent h-10 w-10 animate-spin stroke-2" />
          </div>
        </div>

        <div className="space-y-1 text-center">
          <p className="text-foreground animate-pulse text-sm font-semibold tracking-tight">
            Signing you in...
          </p>
          <p className="text-muted text-xs">Please keep this tab open</p>
        </div>
      </div>

      <div className="mt-auto space-y-4 pt-4">
        <div className="text-muted-foreground/60 border-border/40 flex items-center justify-center gap-5 border-t pt-4 text-xs select-none">
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-emerald-500" /> Local First
          </span>

          <span className="flex items-center gap-1">
            <Shield className="h-3.5 w-3.5 text-blue-500" /> Cloud Backup
          </span>

          <span className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5 text-orange-500" /> Privacy First
          </span>
        </div>
      </div>
    </AuthCard>
  );
};

LoginCallbackPage.displayName = "LoginCallbackPage";

export default LoginCallbackPage;
