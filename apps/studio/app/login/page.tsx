"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Check } from "lucide-react";

import { Input, Button } from "@veriworkly/ui";

import OtpForm from "./component/OtpForm";
import AuthCard from "./component/AuthCard";
import SocialAuth from "./component/SocialAuth";

import { authClient } from "@/lib/auth-client";
import { getSafeAuthCallback } from "@/lib/auth-redirect";

import { fetchApiData } from "@/utils/fetchApiData";

const LoginPage = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref");

    if (!code || sessionStorage.getItem(`affiliate-click:${code}`)) return;

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
  }, []);

  const handleGuestAccess = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const callbackURL = searchParams.get("callbackURL");

    router.push(getSafeAuthCallback(callbackURL));
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
          enable secure cloud backups, generate cover letters, and publish your portfolio to a
          custom subdomain.
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

export default LoginPage;
