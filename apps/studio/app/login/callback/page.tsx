"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@veriworkly/ui";
import { AuthCard } from "../component/AuthCard";

import { getSafeAuthCallback } from "@/lib/auth-redirect";
import { fetchApiData } from "@/utils/fetchApiData";
import { setAllDocumentsSyncEnabled } from "@/features/documents/services/document-sync";
import { setAutoSyncEnabledInLocalStorage } from "@/features/documents/services/workspace-settings";

export default function LoginCallbackPage() {
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
      <div className="flex flex-col items-center justify-center space-y-6 py-12 text-center">
        <Badge className="bg-background/70">Social Authentication</Badge>

        <div className="relative">
          {/* Decorative glowing gradient radial backdrop */}
          <div className="bg-accent/20 absolute -inset-1 animate-pulse rounded-full blur-md" />

          <div className="border-border bg-card/50 relative flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm backdrop-blur">
            <Loader2 className="text-accent h-8 w-8 animate-spin" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Signing you in...
          </h1>
          <p className="text-muted max-w-xs text-sm">
            We are configuring your workspace and syncing your resumes. This will only take a
            moment.
          </p>
        </div>
      </div>
    </AuthCard>
  );
}
