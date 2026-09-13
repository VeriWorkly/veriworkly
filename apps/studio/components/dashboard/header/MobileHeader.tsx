import Link from "next/link";
import Image from "next/image";
import { Menu as MenuIcon, X } from "lucide-react";

import { NewDocumentButton } from "../NewDocumentModal";

interface MobileHeaderProps {
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  onOpenNewDocument: () => void;
}

export function MobileHeader({
  mobileNavOpen,
  onToggleMobileNav,
  onOpenNewDocument,
}: MobileHeaderProps) {
  return (
    <header className="border-border/70 bg-background/90 sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 backdrop-blur lg:hidden">
      <Link href="/" className="flex items-center gap-3" aria-label="VeriWorkly dashboard">
        <Image
          priority
          width={36}
          height={36}
          alt="VeriWorkly"
          src="/veriworkly-logo.png"
          className="h-9 w-9 rounded-xl object-contain"
        />
        <span className="font-extrabold">VeriWorkly</span>
      </Link>

      <div className="flex items-center gap-2">
        <NewDocumentButton compact onClick={onOpenNewDocument} />

        <button
          type="button"
          aria-expanded={mobileNavOpen}
          aria-label="Toggle navigation"
          onClick={onToggleMobileNav}
          className="border-border bg-card text-foreground flex h-10 w-10 items-center justify-center rounded-xl border"
        >
          {mobileNavOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
}
