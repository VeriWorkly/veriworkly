"use client";

import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield, Lock, Check } from "lucide-react";

import { Badge } from "@veriworkly/ui";

import AuthCard from "../component/AuthCard";

import { setAllDocumentsSyncEnabled } from "@/features/documents/services/document-sync";
import { setAutoSyncEnabledInLocalStorage } from "@/features/documents/services/workspace-settings";

import { getSafeAuthCallback } from "@/lib/auth-redirect";

import { fetchApiData } from "@/utils/fetchApiData";

const LoginCallbackPage = () => {
  const router = useRouter();
  const processedRef = useRef(false);

  useEffect(() => {
    // Avoid double-processing in React strict mode
    if (processedRef.current) return;

    processedRef.current = true;

    async function processLogin() {
      try {
        // 1. Enable client-side document synchronization preferences
        setAutoSyncEnabledInLocalStorage(true);
        setAllDocumentsSyncEnabled(true);

        // 2. Notify backend to activate sync
        await fetchApiData("/users/me/sync", {
          method: "PUT",
          body: JSON.stringify({ enabled: true }),
        }).catch((err) => {
          console.error("Failed to enable database sync:", err);
        });

        // 3. Process referral code if it was passed via query parameters
        const searchParams = new URLSearchParams(window.location.search);
        const referralCode = searchParams.get("ref");

        if (referralCode) {
          await fetchApiData("/affiliates/referral", {
            method: "POST",
            body: JSON.stringify({ code: referralCode }),
          }).catch((err) => {
            console.error("Failed to submit affiliate referral:", err);
          });
        }

        toast.success("Successfully signed in!");

        // 4. Safely redirect the user to the destination path
        const callbackURL = searchParams.get("callbackURL");
        const targetPath = getSafeAuthCallback(callbackURL);

        router.push(targetPath);
        router.refresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to sign in.";
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

        <h1 className="text-foreground text-3xl font-semibold tracking-tight">
          Securing your workspace
        </h1>

        <p className="text-muted max-w-md text-sm leading-relaxed md:text-base">
          We are setting up your encrypted document store, initializing local-first databases, and
          syncing your resumes.
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
            Configuring sync environment...
          </p>
          <p className="text-muted text-xs">Please keep this tab open</p>
        </div>
      </div>

      <div className="mt-auto space-y-4 pt-4">
        <div className="text-muted-foreground/60 border-border/40 flex items-center justify-center gap-5 border-t pt-4 text-[10px] select-none">
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-emerald-500" /> Local First
          </span>

          <span className="flex items-center gap-1">
            <Shield className="h-3.5 w-3.5 text-blue-500" /> Encrypted Sync
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
