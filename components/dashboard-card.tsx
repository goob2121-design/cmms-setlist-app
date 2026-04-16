type DashboardCardProps = {
  label: string;
  value: string;
  helper: string;
};

export function DashboardCard({ label, value, helper }: DashboardCardProps) {
  return (
    <article className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-helper">{helper}</p>
    </article>
  );
}
