import { X } from "lucide-react";

import { Modal } from "@veriworkly/ui";

import {
  mainNav,
  supportNav,
  bottomNav,
  StudioNavLink,
  useVisibleNavItems,
} from "../sidebar/StudioNavigation";
import { AccountMenu } from "../account-menu/AccountMenu";
import { ThemeToggle } from "../ThemeToggle";

interface MobileNavDrawerProps {
  pathname: string;
  onClose: () => void;
  email: string;
  displayName: string;
  version: string;
}

export function MobileNavDrawer({
  pathname,
  onClose,
  email,
  displayName,
  version,
}: MobileNavDrawerProps) {
  const navItems = useVisibleNavItems([...mainNav, ...supportNav, ...bottomNav]);

  // Mounted only while open; the kit Modal supplies the focus trap, Escape and scroll lock.
  return (
    <Modal open onClose={onClose}>
      <Modal.Content className="max-h-[calc(100dvh-1rem)] space-y-4 overflow-y-auto p-4">
        <div className="flex items-center justify-between">
          <Modal.Title className="text-base">Navigation</Modal.Title>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="text-muted hover:bg-background flex h-10 w-10 items-center justify-center rounded-xl"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="grid gap-1" aria-label="Mobile studio navigation">
          {navItems.map((item) => (
            <StudioNavLink
              item={item}
              key={item.href}
              active={item.match(pathname)}
              onNavigate={onClose}
            />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <AccountMenu
              collapsed={false}
              displayName={displayName}
              email={email}
              version={version}
            />
          </div>
          <ThemeToggle className="h-9 w-9 shrink-0 rounded-xl px-0" />
        </div>
      </Modal.Content>
    </Modal>
  );
}
