import type { PerformedSetHistory } from "@/lib/types";

type HistoryListProps = {
  items: PerformedSetHistory[];
};

export function HistoryList({ items }: HistoryListProps) {
  return (
    <article className="section-card stack-sm">
      <h2>Recent performed sets</h2>
      {items.length === 0 ? (
        <div className="empty-state">
          <p>No performed set history yet.</p>
        </div>
      ) : (
        <div className="analytics-list">
          {items.map((item) => (
            <div key={item.id} className="analytics-row">
              <div className="stack-xs">
                <strong>{item.setlistName}</strong>
                <p className="cell-note">
                  {new Date(item.performedAt).toLocaleDateString()} at{" "}
                  {new Date(item.performedAt).toLocaleTimeString()}
                </p>
              </div>
              <span className="queue-key">{item.actualDurationMinutes} min</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
