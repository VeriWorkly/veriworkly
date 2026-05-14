"use client";

import Link from "next/link";
import { useState } from "react";

import { Input, Badge, Button } from "@veriworkly/ui";

import OtpForm from "./component/OtpForm";

import { AuthCard } from "./component/AuthCard";
import { LoginFeatures } from "./component/LoginFeatures";

import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const [isLoading, setIsLoading] = useState(false);

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

        <Button size="md" type="submit" className="w-full" disabled={isLoading || !email}>
          {isLoading ? "Sending Code..." : "Send Sign-in Code"}
        </Button>
      </form>

      <p className="text-muted text-center text-xs md:text-sm">
        Want to continue immediately?
        <Link href="/" className="text-foreground ml-1 font-semibold hover:opacity-80">
          Open Dashboard (No Login)
        </Link>
      </p>
    </AuthCard>
  );
};

export default LoginPage;
