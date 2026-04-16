import Link from "next/link";

type SectionCardProps = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
};

export function SectionCard({ title, description, href, ctaLabel }: SectionCardProps) {
  return (
    <article className="section-card">
      <div className="stack-sm">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <Link href={href} className="secondary-button">
        {ctaLabel}
      </Link>
    </article>
  );
}
