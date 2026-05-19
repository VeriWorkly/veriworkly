import Link from "next/link";

const navItems = [
  { href: "/admin", label: "Home" },
  { href: "/admin/roadmap", label: "Roadmap" },
  { href: "/admin/roadmap/new", label: "Create Item" },
  { href: "/", label: "Overview" },
];

const AdminNavbar = () => {
  return (
    <header className="border-border/70 bg-card/90 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div>
          <p className="text-muted text-xs font-medium tracking-[0.18em] uppercase">VeriWorkly</p>

          <p className="text-foreground text-lg font-semibold">Admin Workspace</p>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted hover:text-foreground hover:bg-background rounded-full px-3 py-1.5 text-sm font-medium transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default AdminNavbar;
