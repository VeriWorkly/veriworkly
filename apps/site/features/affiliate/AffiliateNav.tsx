"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

const AffiliateNav = () => {
  return (
    <header className="border-border/40 bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" />
          Back to VeriWorkly
        </Link>
        <div className="text-muted-foreground flex items-center gap-2 font-mono text-xs">
          <Shield className="h-4 w-4 text-blue-500" />
          <span>Opt-in Partner Program</span>
        </div>
      </div>
    </header>
  );
};

export default AffiliateNav;
