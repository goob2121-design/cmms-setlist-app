import { AnalyticsList } from "@/components/analytics-list";
import { DashboardCard } from "@/components/dashboard-card";
import { HistoryList } from "@/components/history-list";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { getDashboardAnalytics } from "@/lib/analytics";

export default async function DashboardPage() {
  const analytics = await getDashboardAnalytics().catch(() => ({
    totalPerformedSets: 0,
    averageSetDurationMinutes: 0,
    mostPlayedSongs: [],
    mostCommonOpeners: [],
    mostCommonClosers: [],
    recentPerformedSets: []
  }));

  return (
    <section className="stack-lg">
      <PageHeader
        title="Dashboard"
        description="Track performed sets, spot song patterns, and improve future show flow."
      />

      <section className="dashboard-grid">
        <DashboardCard
          label="Performed sets"
          value={String(analytics.totalPerformedSets)}
          helper="Saved from live shows and performance wraps"
        />
        <DashboardCard
          label="Average set length"
          value={`${analytics.averageSetDurationMinutes.toFixed(1)} min`}
          helper="Based on actual saved performance history"
        />
        <DashboardCard
          label="Top opener"
          value={analytics.mostCommonOpeners[0]?.title ?? "No data yet"}
          helper={
            analytics.mostCommonOpeners[0]
              ? `Used ${analytics.mostCommonOpeners[0].count} times`
              : "Perform a set to build opener stats"
          }
        />
      </section>

      <div className="dashboard-columns">
        <SectionCard
          title="Song Library"
          description="Manage keys, tempo, singers, stage notes, and tags."
          href="/songs"
          ctaLabel="Browse songs"
        />
        <SectionCard
          title="Setlists"
          description="Create show plans, reorder songs, and track total duration."
          href="/setlists"
          ctaLabel="Open setlists"
        />
        <SectionCard
          title="Live Mode"
          description="Advance the show, cut or add time, and keep the whole band in sync."
          href="/live"
          ctaLabel="Start live mode"
        />
      </div>

      <div className="dashboard-columns">
        <AnalyticsList
          title="Most played songs"
          emptyText="No song stats yet."
          items={analytics.mostPlayedSongs.map((item) => ({
            title: item.title,
            value: `${item.count}x`
          }))}
        />
        <AnalyticsList
          title="Most common openers"
          emptyText="No opener stats yet."
          items={analytics.mostCommonOpeners.map((item) => ({
            title: item.title,
            value: `${item.count}x`
          }))}
        />
        <AnalyticsList
          title="Most common closers"
          emptyText="No closer stats yet."
          items={analytics.mostCommonClosers.map((item) => ({
            title: item.title,
            value: `${item.count}x`
          }))}
        />
      </div>

      <HistoryList items={analytics.recentPerformedSets} />
    </section>
  );
}
