"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { Modal } from "@veriworkly/ui";

import AdminCommandPalette from "@/components/admin/shell/AdminCommandPalette";
import AdminSidebar from "@/components/admin/shell/AdminSidebar";
import AdminTopbar from "@/components/admin/shell/AdminTopbar";
import type { AdminActionQueue } from "@/features/admin/types/admin-types";

interface AdminShellProps {
  adminEmail: string;
  queue: AdminActionQueue;
  children: ReactNode;
}

/**
 * The admin chrome: fixed sidebar, sticky topbar, scrolling content well.
 *
 * This is the only client component in the shell — the sidebar and topbar need the current
 * pathname and the drawer/palette need state, but everything rendered into `children` stays a
 * server component. That boundary matters: the pages inside are data-heavy server renders and
 * must not be pulled into the client bundle just because their chrome is interactive.
 */
const AdminShell = ({ adminEmail, queue, children }: AdminShellProps) => {
  const pathname = usePathname();

  const [paletteOpen, setPaletteOpen] = useState(false);

  /**
   * The drawer records which route it was opened on, and is treated as closed once the route
   * changes. A drawer left open across a navigation would cover the page the operator just
   * asked for, but closing it from an effect on `pathname` means rendering the open drawer
   * once and then immediately re-rendering to hide it. Deriving it here closes the drawer in
   * the same render as the navigation, with no intermediate frame.
   */
  const [drawer, setDrawer] = useState({ open: false, path: pathname });
  const drawerOpen = drawer.open && drawer.path === pathname;

  const openDrawer = () => setDrawer({ open: true, path: pathname });
  const closeDrawer = () => setDrawer({ open: false, path: pathname });

  // The drawer is the phone and tablet nav. Widening to the desktop layout (lg) shows the rail,
  // so an open drawer would leave only its overlay and scroll lock over the page: close it.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setDrawer((current) => ({ ...current, open: false }));
    };

    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        // Chrome binds Ctrl+K to the address bar; without this the palette never opens on
        // Windows and Linux.
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="bg-background min-h-screen">
      {/* Desktop rail. Fixed rather than sticky so a long table scrolls under a still nav. */}
      <aside className="border-border bg-admin-chrome fixed inset-y-0 left-0 z-40 hidden w-60 border-r lg:block">
        <AdminSidebar queue={queue} />
      </aside>

      {/*
        The shared Modal, slid in from the left: it traps focus, closes on Escape and returns
        focus to the menu button, which a hand-rolled overlay did not.
      */}
      <Modal open={drawerOpen} onClose={closeDrawer}>
        <Modal.Content
          aria-label="Admin navigation"
          className={
            "bg-admin-chrome border-border absolute inset-y-0 left-0 h-full w-72 max-w-[85vw] rounded-none border-0 border-r p-0 pb-0 " +
            "md:max-w-72 md:rounded-none " +
            "transition-[opacity,transform,translate] starting:-translate-x-full starting:translate-y-0 " +
            "md:starting:-translate-x-full md:starting:scale-100 md:starting:opacity-100 " +
            "[&>div[aria-hidden]:first-child]:hidden"
          }
        >
          <button
            type="button"
            onClick={() => closeDrawer()}
            aria-label="Close navigation"
            className="text-muted hover:text-foreground focus-visible:ring-accent absolute top-3.5 right-3 z-10 rounded-lg p-1.5 transition focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="h-4 w-4" />
          </button>

          <AdminSidebar queue={queue} onNavigate={() => closeDrawer()} />
        </Modal.Content>
      </Modal>

      <div className="flex min-h-screen flex-col lg:pl-60">
        <AdminTopbar
          adminEmail={adminEmail}
          onOpenSidebar={() => openDrawer()}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <main className="mx-auto w-full max-w-368 flex-1 px-4 py-5 md:px-6 md:py-6">
          {children}
        </main>
      </div>

      {/*
        Mounted only while open, so every opening starts from a fresh query and highlight
        without an effect that resets them.
      */}
      {paletteOpen ? <AdminCommandPalette onClose={() => setPaletteOpen(false)} /> : null}
    </div>
  );
};

export default AdminShell;
