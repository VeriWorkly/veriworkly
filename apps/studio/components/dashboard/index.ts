export { StudioShell, default } from "./StudioShell";

// Sidebar & Navigation
export { StudioSidebar } from "./sidebar/StudioSidebar";
export { StudioSidebarHeader } from "./sidebar/StudioSidebarHeader";
export {
  mainNav,
  supportNav,
  bottomNav,
  NavGroup,
  StudioNavLink,
} from "./sidebar/StudioNavigation";
export type { StudioNavItem } from "./sidebar/StudioNavigation";

// Header & Mobile Nav
export { MobileHeader } from "./header/MobileHeader";
export { MobileNavDrawer } from "./header/MobileNavDrawer";

// Account Menu
export { AccountMenu } from "./account-menu/AccountMenu";
export { default as AccountMenuItem } from "./account-menu/AccountMenuItem";
export { default as AccountMenuTheme } from "./account-menu/AccountMenuTheme";

// Modals
export { DashboardModalsHost } from "./modals/DashboardModalsHost";
export { NewDocumentButton, NewDocumentModal } from "./NewDocumentModal";
export { WorkspaceSearchModal } from "./WorkspaceSearchModal";
export { ImportProfileModal } from "./ImportProfileModal";

// Utility Components
export { ThemeToggle } from "./ThemeToggle";
export { ComingSoon } from "./ComingSoon";

// Hooks
export { useCreateDocument } from "./hooks/useCreateDocument";
export { useStudioShortcuts } from "./hooks/useStudioShortcuts";
