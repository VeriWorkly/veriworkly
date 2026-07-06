"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { Input, Button } from "@veriworkly/ui";
import { Shield, Lock, Check } from "lucide-react";

import AuthCard from "./AuthCard";

import { setAllDocumentsSyncEnabled } from "@/features/documents/services/document-sync";
import { setAutoSyncEnabledInLocalStorage } from "@/features/documents/services/workspace-settings";

import { authClient } from "@/lib/auth-client";
import { getSafeAuthCallback } from "@/lib/auth-redirect";

import { fetchApiData } from "@/utils/fetchApiData";

const OtpForm = ({
  sentTo,
  setSent,
}: {
  sentTo: string;
  setSent: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);

    return () => clearInterval(timerId);
  }, [timeLeft]);

  const verifyCode = async (code: string) => {
    if (!sentTo || code.length !== 6 || isLoading) return;

    setIsLoading(true);

    try {
      const { error: authError } = await authClient.signIn.emailOtp({
        email: sentTo,
        otp: code,
        name: "Veriworkly User",
      });

      if (authError) {
        toast.error(authError.message || "Invalid or expired code.");
        return;
      }

      toast.success("Successfully signed in!");

      setAutoSyncEnabledInLocalStorage(true);
      setAllDocumentsSyncEnabled(true);

      await fetchApiData("/users/me/sync", {
        method: "PUT",
        body: JSON.stringify({ enabled: true }),
      }).catch(() => undefined);

      const searchParams = new URLSearchParams(window.location.search);
      const referralCode = searchParams.get("ref");

      if (referralCode)
        await fetchApiData("/affiliates/referral", {
          method: "POST",
          body: JSON.stringify({ code: referralCode }),
        }).catch(() => undefined);

      let callbackURL = searchParams.get("callbackURL");

      if (!callbackURL && typeof document !== "undefined" && document.referrer) {
        try {
          const refUrl = new URL(document.referrer);

          if (refUrl.pathname !== "/login" && refUrl.origin === window.location.origin)
            callbackURL = document.referrer;
        } catch {
          // Safe fallback for malformed referrer URLs
        }
      }

      router.push(getSafeAuthCallback(callbackURL));
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Verification failed. Please check your connection.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await verifyCode(otp);
  };

  const handleResend = async () => {
    if (timeLeft > 0) return;

    setIsLoading(true);

    try {
      const { error: resendError } = await authClient.emailOtp.sendVerificationOtp({
        email: sentTo,
        type: "sign-in",
      });

      if (resendError) toast.error(resendError.message || "Failed to resend code.");
      else {
        setTimeLeft(60);
        setOtp("");
        toast.success("A new code has been sent to your email.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Resend failed. Please check your connection.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard blurPosition="top-right">
      <div className="space-y-3">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">Check your email</h1>

        <p className="text-muted text-sm leading-relaxed md:text-base">
          We sent a secure sign-in code to
          <span className="text-foreground mx-1.5 font-semibold">{sentTo}</span>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setSent(false)}
            className="text-accent focus-visible:ring-accent/40 cursor-pointer rounded px-1 text-sm font-semibold underline underline-offset-4 transition-all hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
          >
            Change
          </button>
        </p>
      </div>

      <div className="my-auto flex flex-1 flex-col justify-center space-y-5">
        <div className="border-border/80 bg-background/65 space-y-2.5 rounded-2xl border p-4 backdrop-blur">
          <p className="text-muted text-xs leading-relaxed">
            Enter the 6-digit code below. This code is valid for{" "}
            <span className="text-foreground font-semibold">5 minutes</span>. If you don&apos;t see
            the email, please check your spam or junk folder.
          </p>

          <div className="bg-border/40 h-px w-full" />

          <p className="text-muted text-xs leading-relaxed">
            <span className="text-foreground font-semibold">Tip:</span> Keep this page open while
            you check your inbox.
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="otp" className="text-foreground text-sm font-medium">
              Verification Code
            </label>

            <Input
              id="otp"
              required
              autoFocus
              type="text"
              value={otp}
              minLength={6}
              maxLength={6}
              pattern="\d{6}"
              inputMode="numeric"
              placeholder="000000"
              autoComplete="one-time-code"
              className="text-center font-mono text-2xl tracking-[0.5em] transition-all duration-200 focus:scale-[1.01]"
              onChange={(event) => {
                const val = event.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(val);
                if (val.length === 6) {
                  void verifyCode(val);
                }
              }}
            />
          </div>

          <Button
            size="md"
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            {isLoading ? "Verifying..." : "Verify & Sign In"}
          </Button>
        </form>
      </div>

      <div className="mt-auto space-y-4 pt-4">
        <p className="text-center text-sm">
          <span className="text-muted">Didn&apos;t receive the code? </span>

          {timeLeft > 0 ? (
            <span className="text-muted-foreground font-medium">Resend in {timeLeft}s</span>
          ) : (
            <button
              type="button"
              disabled={isLoading}
              onClick={handleResend}
              className="text-accent focus-visible:ring-accent/40 cursor-pointer rounded px-1 font-semibold underline underline-offset-4 transition-all hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              Resend Code
            </button>
          )}
        </p>

        <div className="sr-only" aria-live="polite">
          {timeLeft === 0 && "Verification code resend is now available."}
        </div>

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

export default OtpForm;
