import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Song, SongFormValues } from "@/lib/types";

type SongRow = {
  id: string;
  title: string;
  key: string;
  tempo: Song["tempo"];
  duration: number | string;
  singer: string;
  notes: string | null;
  tags: string[] | null;
};

function mapSongRow(row: SongRow): Song {
  return {
    id: row.id,
    title: row.title,
    key: row.key,
    tempo: row.tempo,
    duration: typeof row.duration === "number" ? row.duration : Number(row.duration),
    singer: row.singer,
    notes: row.notes ?? "",
    tags: row.tags ?? []
  };
}

export async function listSongs() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("songs")
    .select("id, title, key, tempo, duration, singer, notes, tags")
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapSongRow(row as SongRow));
}

export async function getSong(songId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("songs")
    .select("id, title, key, tempo, duration, singer, notes, tags")
    .eq("id", songId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSongRow(data as SongRow);
}

export async function createSong(values: SongFormValues) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("songs")
    .insert(values)
    .select("id, title, key, tempo, duration, singer, notes, tags")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSongRow(data as SongRow);
}

export async function updateSong(songId: string, values: Partial<SongFormValues>) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("songs")
    .update(values)
    .eq("id", songId)
    .select("id, title, key, tempo, duration, singer, notes, tags")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSongRow(data as SongRow);
}

export async function deleteSong(songId: string) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("songs").delete().eq("id", songId);

  if (error) {
    throw new Error(error.message);
  }
}
