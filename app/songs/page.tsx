export const dynamic = "force-dynamic";

import { SongLibraryManager } from "@/components/song-library-manager";
import { PageHeader } from "@/components/page-header";
import { listSongs } from "@/lib/songs";

export default async function SongsPage() {
  const songs = await listSongs().catch(() => []);

  return (
    <section className="stack-lg">
      <PageHeader
        title="Song Library"
        description="Add, edit, delete, and review songs from one stage-friendly library screen."
      />
      <SongLibraryManager initialSongs={songs} />
    </section>
  );
}