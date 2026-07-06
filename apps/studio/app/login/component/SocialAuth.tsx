"use client";

import Image from "next/image";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@veriworkly/ui";

import { authClient } from "@/lib/auth-client";

interface SocialAuthProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function SocialAuth({ isLoading, setIsLoading }: SocialAuthProps) {
  const [activeProvider, setActiveProvider] = useState<"google" | "github" | "linkedin" | null>(
    null,
  );

  const handleSocialSignIn = async (provider: "google" | "github" | "linkedin") => {
    if (isLoading) return;

    setIsLoading(true);
    setActiveProvider(provider);

    try {
      const searchParams = new URLSearchParams(window.location.search);

      const callbackURL =
        searchParams.get("callbackURL") ||
        (typeof document !== "undefined" ? document.referrer : null) ||
        "/";
      const ref = searchParams.get("ref");

      const callbackPath =
        `/login/callback?callbackURL=${encodeURIComponent(callbackURL)}` +
        (ref ? `&ref=${encodeURIComponent(ref)}` : "");
      const absoluteCallbackURL = `${window.location.origin}${callbackPath}`;

      await authClient.signIn.social({
        provider,
        callbackURL: absoluteCallbackURL,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Social authentication failed.";
      toast.error(message);
      setIsLoading(false);
      setActiveProvider(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="my-6 flex items-center gap-3">
        <div className="border-border/80 h-px flex-1 border-t border-dashed" />

        <span className="text-muted shrink-0 text-[10px] font-medium tracking-wider uppercase">
          or continue with
        </span>

        <div className="border-border/80 h-px flex-1 border-t border-dashed" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button
          size="md"
          variant="secondary"
          disabled={isLoading}
          aria-label="Sign in with Google"
          onClick={() => handleSocialSignIn("google")}
          className="border-border/80 hover:border-accent/40 h-12 w-full rounded-2xl border shadow-sm transition-all duration-300 hover:scale-[1.02] hover:bg-neutral-50 active:scale-[0.98] dark:hover:bg-slate-800/40"
        >
          {activeProvider === "google" ? (
            <Loader2 className="text-muted h-5 w-5 animate-spin" />
          ) : (
            <Image src="/icons/socials/google.svg" width={20} height={20} alt="" />
          )}
        </Button>

        <Button
          size="md"
          variant="secondary"
          disabled={isLoading}
          aria-label="Sign in with GitHub"
          onClick={() => handleSocialSignIn("github")}
          className="border-border/80 hover:border-accent/40 h-12 w-full rounded-2xl border shadow-sm transition-all duration-300 hover:scale-[1.02] hover:bg-neutral-50 active:scale-[0.98] dark:hover:bg-slate-800/40"
        >
          {activeProvider === "github" ? (
            <Loader2 className="text-muted h-5 w-5 animate-spin" />
          ) : (
            <Image
              src="/icons/socials/github.svg"
              width={20}
              height={20}
              className="dark:invert"
              alt=""
            />
          )}
        </Button>

        <Button
          size="md"
          variant="secondary"
          disabled={isLoading}
          aria-label="Sign in with LinkedIn"
          onClick={() => handleSocialSignIn("linkedin")}
          className="border-border/80 hover:border-accent/40 h-12 w-full rounded-2xl border shadow-sm transition-all duration-300 hover:scale-[1.02] hover:bg-neutral-50 active:scale-[0.98] dark:hover:bg-slate-800/40"
        >
          {activeProvider === "linkedin" ? (
            <Loader2 className="text-muted h-5 w-5 animate-spin" />
          ) : (
            <Image
              src="/icons/socials/linkedIn.svg"
              width={20}
              height={20}
              className="dark:invert"
              alt=""
            />
          )}
        </Button>
      </div>
    </div>
  );
}
