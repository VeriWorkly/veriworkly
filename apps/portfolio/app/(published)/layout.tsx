import "../globals.css";

// A published portfolio is the owner's site, not a VeriWorkly page: this root layout carries no
// platform metadata, fonts, Organization JSON-LD, theme script or toaster.
export default function PublishedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
