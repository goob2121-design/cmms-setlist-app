import type { Metadata } from "next";
import { ShellNav } from "@/components/shell-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bluegrass Setlist Manager",
  description: "Live show setlist planning and stage management for acoustic bands."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <ShellNav />
          <main className="page-shell">{children}</main>
        </div>
      </body>
    </html>
  );
}
