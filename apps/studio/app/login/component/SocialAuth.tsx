"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@veriworkly/ui";
import { authClient } from "@/lib/auth-client";

// Custom SVG Icons that don't exist in Lucide
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

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
      <div className="relative my-5 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="border-border/80 w-full border-t border-dashed" />
        </div>
        <span className="bg-card text-muted relative px-3 text-xs font-medium tracking-wider uppercase">
          or continue with
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button
          variant="secondary"
          size="md"
          disabled={isLoading}
          onClick={() => handleSocialSignIn("google")}
          className="hover:border-accent/40 h-12 w-full rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          aria-label="Sign in with Google"
        >
          {activeProvider === "google" ? (
            <Loader2 className="text-muted h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant="secondary"
          size="md"
          disabled={isLoading}
          onClick={() => handleSocialSignIn("github")}
          className="hover:border-accent/40 h-12 w-full rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          aria-label="Sign in with GitHub"
        >
          {activeProvider === "github" ? (
            <Loader2 className="text-muted h-5 w-5 animate-spin" />
          ) : (
            <GitHubIcon className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant="secondary"
          size="md"
          disabled={isLoading}
          onClick={() => handleSocialSignIn("linkedin")}
          className="hover:border-accent/40 h-12 w-full rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          aria-label="Sign in with LinkedIn"
        >
          {activeProvider === "linkedin" ? (
            <Loader2 className="text-muted h-5 w-5 animate-spin" />
          ) : (
            <LinkedInIcon className="h-5 w-5 text-[#0A66C2]" />
          )}
        </Button>
      </div>
    </div>
  );
}
