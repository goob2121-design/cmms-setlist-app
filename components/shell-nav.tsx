import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Music2, Radio, Rows3 } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/songs", label: "Songs", icon: Music2 },
  { href: "/setlists", label: "Setlists", icon: Rows3 },
  { href: "/live", label: "Live", icon: Radio }
];

export function ShellNav() {
  return (
    <nav className="shell-nav" aria-label="Primary">
      <div className="brand-lockup">
        <Image
  src="/logo.png"
  alt="CMMS Logo"
  width={180}
  height={70}
  style={{ objectFit: "contain" }}
/>
        <div>
          <p className="brand-title">Cumberland Mountain Music Show</p>
          <p className="brand-subtitle">Live show manager</p>
        </div>
      </div>

      <div className="nav-links">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href as any} className="nav-link">
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
