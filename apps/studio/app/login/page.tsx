"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Input, Badge, Button } from "@veriworkly/ui";

import OtpForm from "./component/OtpForm";
import SocialAuth from "./component/SocialAuth";

import { AuthCard } from "./component/AuthCard";
import { LoginFeatures } from "./component/LoginFeatures";

import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { fetchApiData } from "@/utils/fetchApiData";
import { getSafeAuthCallback } from "@/lib/auth-redirect";

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
      <div className="space-y-4">
        <Badge className="bg-background/70">Optional Login</Badge>

        <div className="space-y-3">
          <h1 className="text-foreground text-3xl font-semibold tracking-tight">
            Use without login. Sign in for extras.
          </h1>

          <p className="text-muted max-w-md text-sm md:text-base">
            Resume building is fully available without an account. Login adds sync and advanced
            sharing features.
          </p>
        </div>
      </div>

      <LoginFeatures variant="compact" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-foreground text-sm font-medium">
            Email
          </label>

          <Input
            required
            autoFocus
            id="email"
            type="email"
            value={email}
            autoComplete="email"
            disabled={isLoading}
            placeholder="hello@veriworkly.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Button
          size="md"
          type="submit"
          className="w-full transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          disabled={isLoading || !email}
        >
          {isLoading ? "Sending Code..." : "Send Sign-in Code"}
        </Button>
      </form>

      <SocialAuth isLoading={isLoading} setIsLoading={setIsLoading} />

      <p className="text-muted text-center text-xs md:text-sm">
        Want to continue immediately?
        <button
          onClick={handleGuestAccess}
          className="text-foreground ml-1 font-semibold hover:opacity-80"
        >
          Open Dashboard (No Login)
        </button>
      </p>
    </AuthCard>
  );
};

export default LoginPage;
