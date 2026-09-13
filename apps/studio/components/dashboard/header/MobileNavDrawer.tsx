import { mainNav, supportNav, bottomNav, StudioNavLink } from "../sidebar/StudioNavigation";
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
  return (
    <div className="border-border/70 bg-background/95 space-y-4 border-b p-4 backdrop-blur lg:hidden">
      <nav className="grid gap-1" aria-label="Mobile studio navigation">
        {[...mainNav, ...supportNav, ...bottomNav].map((item) => (
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
    </div>
  );
}
