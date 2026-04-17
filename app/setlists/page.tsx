export const dynamic = "force-dynamic";

import { SetlistBuilder } from "@/components/setlist-builder";
import { PageHeader } from "@/components/page-header";
import { listSetlists } from "@/lib/setlists";
import { listSongs } from "@/lib/songs";

export default async function SetlistsPage() {
  const [songs, setlists] = await Promise.all([
    listSongs().catch(() => []),
    listSetlists().catch(() => [])
  ]);

  return (
    <section className="stack-lg">
      <PageHeader
        title="Setlists"
        description="Build a set from the song library, drag songs into order, and save the flow."
      />
      <SetlistBuilder songs={songs} initialSetlists={setlists} />
    </section>
  );
}