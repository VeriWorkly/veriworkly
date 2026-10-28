"use client";

import { toast } from "sonner";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Lock, Check } from "lucide-react";

import { Input, Button } from "@veriworkly/ui";

import OtpForm from "./component/OtpForm";
import AuthCard from "./component/AuthCard";
import SocialAuth from "./component/SocialAuth";

import { siteConfig } from "@/config/site";
import { authClient } from "@/lib/auth-client";
import { rememberReferralCode, signInFailureFromQuery } from "@/lib/sign-in";
import { getGuestLandingPath, getSafeAuthCallback } from "@/lib/auth-redirect";

import { fetchApiData } from "@/utils/fetchApiData";

/**
 * Everything on /login that reads the query string. It sits in its own Suspense boundary so
 * that the form around it is in the prerendered HTML instead of a client-side bailout.
 */
const LoginSearchParamEffects = () => {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("ref");
    if (!code) return;

    // Kept until the first sign-in, even if the visitor continues as a guest first.
    rememberReferralCode(code);

    if (sessionStorage.getItem(`affiliate-click:${code}`)) return;

    sessionStorage.setItem(`affiliate-click:${code}`, "1");

    let referrerHost: string | undefined = undefined;

    if (document.referrer) {
      try {
        referrerHost = new URL(document.referrer).hostname;
      } catch {
        // Safe fallback for malformed referrer URLs
      }
    }

    void fetchApiData("/affiliates/click", {
      method: "POST",
      body: JSON.stringify({
        code,
        referrerHost,
      }),
    }).catch(() => sessionStorage.removeItem(`affiliate-click:${code}`));
  }, [searchParams]);

  useEffect(() => {
    const failure = signInFailureFromQuery(searchParams);

    if (failure) {
      (failure.tone === "info" ? toast.info : toast.error)(failure.message);

      // Clean up the error query parameters from URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      url.searchParams.delete("error_description");
      const remainingSearch = url.searchParams.toString();
      window.history.replaceState(
        {},
        "",
        url.pathname + (remainingSearch ? `?${remainingSearch}` : ""),
      );
    }

    if (searchParams.get("session") === "expired") {
      toast.info("Your session ended. Sign in again to continue.");
    }
  }, [searchParams]);

  return null;
};

const LoginForm = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleGuestAccess = () => {
    const callbackURL = new URLSearchParams(window.location.search).get("callbackURL");
    const target = getGuestLandingPath(callbackURL);

    if (target !== getSafeAuthCallback(callbackURL)) {
      toast.info("That page needs an account, so you are on the overview instead.");
    }

    const maxAge = 60 * 60 * 24 * 30; // 30 days
    const isSecure = window.location.protocol === "https:";
    const hostname = window.location.hostname;

    let domainAttr = "";
    if (hostname.endsWith("veriworkly.com")) {
      domainAttr = "; domain=.veriworkly.com";
    } else if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      domainAttr = "; domain=.localhost";
    }

    if (domainAttr) {
      document.cookie = `veriworkly-guest-mode=true; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? "; Secure" : ""}${domainAttr}`;
    }
    document.cookie = `veriworkly-guest-mode=true; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? "; Secure" : ""}`;

    if (target.startsWith("http://") || target.startsWith("https://")) {
      window.location.href = target;
    } else {
      router.push(target);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoading || !email) return;

    setIsLoading(true);

    try {
      const { error: authError } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      if (authError) {
        toast.error(authError.message || "Failed to send code. Please try again.");
        return;
      }

      setSentTo(email);
      setSent(true);
      toast.success("Verification code sent to your email!");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch. Please check your connection.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) return <OtpForm sentTo={sentTo} setSent={setSent} />;

  return (
    <AuthCard blurPosition="top-left">
      <div className="space-y-3">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">
          Sign in to VeriWorkly
        </h1>

        <p className="text-muted max-w-md text-sm leading-relaxed md:text-base">
          Sign in is optional. Your data is stored locally in your browser by default. Sign in to
          back up your documents to the cloud, share them, and use ATS checks, imports, and AI help.
        </p>
      </div>

      <div className="my-auto flex flex-1 flex-col justify-center space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-foreground text-sm font-medium">
              Email address
            </label>

            <Input
              required
              autoFocus
              id="email"
              type="email"
              value={email}
              autoComplete="email"
              disabled={isLoading}
              placeholder="name@email.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button
            size="md"
            type="submit"
            disabled={isLoading || !email}
            className="w-full transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            {isLoading ? "Sending Code..." : "Send Verification Code"}
          </Button>
        </form>

        <SocialAuth isLoading={isLoading} setIsLoading={setIsLoading} />

        <p className="text-muted text-center text-xs">
          By continuing you agree to the{" "}
          <a
            href={`${siteConfig.links.main}/terms`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground font-semibold underline-offset-2 hover:underline"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href={`${siteConfig.links.main}/privacy`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground font-semibold underline-offset-2 hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>

      <div className="mt-auto space-y-4 pt-4">
        <p className="text-muted text-center text-xs md:text-sm">
          Want to skip sign in?
          <button
            onClick={handleGuestAccess}
            className="text-foreground focus-visible:ring-accent/40 ml-1 cursor-pointer rounded px-1 font-semibold transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none"
          >
            Continue as Guest
          </button>
        </p>

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

const LoginPage = () => (
  <>
    <Suspense fallback={null}>
      <LoginSearchParamEffects />
    </Suspense>
    <LoginForm />
  </>
);

export default LoginPage;
