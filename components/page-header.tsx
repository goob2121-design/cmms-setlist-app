type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="stack-xs">
        <p className="eyebrow">Bluegrass Setlist Manager</p>
        <h1>{title}</h1>
      </div>
      <p className="page-description">{description}</p>
    </header>
  );
}
