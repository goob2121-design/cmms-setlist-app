type AnalyticsListProps = {
  title: string;
  emptyText: string;
  items: Array<{
    title: string;
    value: string;
    helper?: string;
  }>;
};

export function AnalyticsList({ title, emptyText, items }: AnalyticsListProps) {
  return (
    <article className="section-card stack-sm">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <div className="empty-state">
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="analytics-list">
          {items.map((item) => (
            <div key={`${title}-${item.title}`} className="analytics-row">
              <div className="stack-xs">
                <strong>{item.title}</strong>
                {item.helper ? <p className="cell-note">{item.helper}</p> : null}
              </div>
              <span className="queue-key">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
