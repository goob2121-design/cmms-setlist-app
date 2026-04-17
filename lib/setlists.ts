import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listSongs } from "@/lib/songs";
import type { SetlistDetail, SetlistFormValues, SetlistItem, SetlistSummary, Song } from "@/lib/types";

type SetlistItemRow = {
  id: string;
  song_id: string;
  position: number;
  is_optional: boolean;
  arrangement_notes: string | null;
};

type SetlistRow = {
  id: string;
  name: string;
  description: string | null;
  status: SetlistSummary["status"];
  setlist_songs: SetlistItemRow[] | null;
};

function mapSetlistItem(row: SetlistItemRow, songsMap: Record<string, Song>): SetlistItem {
  const song = songsMap[row.song_id];

  return {
    id: row.id,
    songId: row.song_id,
    position: row.position,
    isOptional: row.is_optional,
    arrangementNotes: row.arrangement_notes ?? "",
    song: song ?? {
      id: row.song_id,
      title: "Unknown Song",
      key: "",
      tempo: "medium",
      duration: 0,
      singer: "",
      notes: "",
      tags: []
    }
  };
}

async function mapSetlist(row: SetlistRow): Promise<SetlistDetail> {
  const songs = await listSongs();
  const songsMap = Object.fromEntries(songs.map((s) => [s.id, s]));

  const items = (row.setlist_songs ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => mapSetlistItem(item, songsMap));

  const totalDurationMinutes = items.reduce((total, item) => total + item.song.duration, 0);

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    status: row.status,

    // ✅ FIXED LINE HERE
    songCount: row.setlist_songs?.length ?? 0,

    totalDurationMinutes,
    items
  };
}

async function fetchSetlistById(setlistId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("setlists")
    .select(`
      id,
      name,
      description,
      status,
      setlist_songs (
        id,
        song_id,
        position,
        is_optional,
        arrangement_notes
      )
    `)
    .eq("id", setlistId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSetlist(data as SetlistRow);
}

export async function listSetlists() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("setlists")
    .select(`
      id,
      name,
      description,
      status,
      setlist_songs (
        id,
        song_id,
        position,
        is_optional,
        arrangement_notes
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return await Promise.all((data as SetlistRow[] | null)?.map((row) => mapSetlist(row)) ?? []);
}

export async function getSetlist(setlistId: string) {
  return fetchSetlistById(setlistId);
}

export async function createSetlist(values: SetlistFormValues) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("setlists")
    .insert({
      name: values.name,
      description: values.description,
      status: values.status ?? "draft"
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const setlistId = (data as { id: string }).id;

  if (values.items.length > 0) {
    const { error: itemsError } = await supabase.from("setlist_songs").insert(
      values.items.map((item, index) => ({
        setlist_id: setlistId,
        song_id: item.songId,

        // 🔥 ALSO FIXED (prevents future issues)
        position: index,

        is_optional: item.isOptional ?? false,
        arrangement_notes: item.arrangementNotes ?? ""
      }))
    );

    if (itemsError) {
      await supabase.from("setlists").delete().eq("id", setlistId);
      throw new Error(itemsError.message);
    }
  }

  return fetchSetlistById(setlistId);
}

export async function updateSetlist(setlistId: string, values: Partial<SetlistFormValues>) {
  const supabase = createServerSupabaseClient();
  const metadata: Record<string, string> = {};

  if (typeof values.name === "string") metadata.name = values.name;
  if (typeof values.description === "string") metadata.description = values.description;
  if (typeof values.status === "string") metadata.status = values.status;

  if (Object.keys(metadata).length > 0) {
    const { error } = await supabase.from("setlists").update(metadata).eq("id", setlistId);
    if (error) throw new Error(error.message);
  }

  if (values.items) {
    await supabase.from("setlist_songs").delete().eq("setlist_id", setlistId);

    if (values.items.length > 0) {
      const { error } = await supabase.from("setlist_songs").insert(
        values.items.map((item, index) => ({
          setlist_id: setlistId,
          song_id: item.songId,

          // 🔥 ALSO FIXED HERE
          position: index,

          is_optional: item.isOptional ?? false,
          arrangement_notes: item.arrangementNotes ?? ""
        }))
      );

      if (error) throw new Error(error.message);
    }
  }

  return fetchSetlistById(setlistId);
}

export async function deleteSetlist(setlistId: string) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("setlists").delete().eq("id", setlistId);

  if (error) throw new Error(error.message);
}