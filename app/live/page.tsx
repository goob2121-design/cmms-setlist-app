import { LiveModePanel } from "@/components/live-mode-panel";
import { PageHeader } from "@/components/page-header";
import { listSetlists } from "@/lib/setlists";
import { listSongs } from "@/lib/songs";

export default async function LivePage() {
  const [setlists, songs] = await Promise.all([
    listSetlists().catch(() => []),
    listSongs().catch(() => [])
  ]);

  return (
    <section className="stack-lg">
      <PageHeader
        title="Live Mode"
        description="A full-screen stage view for advancing songs, reading notes, and adapting the set live."
      />
      <LiveModePanel setlists={setlists} songs={songs} />
    </section>
  );
}
