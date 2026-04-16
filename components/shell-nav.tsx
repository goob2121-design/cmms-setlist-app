import Link from "next/link";
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
        <span className="brand-mark">BG</span>
        <div>
          <p className="brand-title">Bluegrass Setlist</p>
          <p className="brand-subtitle">Live show manager</p>
        </div>
      </div>

      <div className="nav-links">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="nav-link">
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
