import Link from "next/link";
import { DashboardCard } from "@/components/dashboard-card";
import { mockDashboardStats } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <section className="stack-lg">
      <div className="hero-panel">
        <div className="stack-sm">
          <p className="eyebrow">Stage-ready show control</p>
          <h1>Manage songs, build sets, and run the show from any phone or tablet.</h1>
          <p className="hero-copy">
            This starter is structured for live collaboration, fast stage visibility, and
            Supabase-powered syncing across the whole band.
          </p>
        </div>

        <div className="hero-actions">
          <Link className="primary-button" href="/dashboard">
            Open dashboard
          </Link>
          <Link className="secondary-button" href="/live">
            Enter live mode
          </Link>
        </div>
      </div>

      <section className="dashboard-grid">
        {mockDashboardStats.map((item) => (
          <DashboardCard key={item.label} {...item} />
        ))}
      </section>
    </section>
  );
}
