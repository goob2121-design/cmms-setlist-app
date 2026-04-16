import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DashboardAnalytics, PerformedSetHistory } from "@/lib/types";

type ShowHistoryRow = {
  id: string;
  setlist_id: string;
  actual_duration_minutes: number | null;
  created_at: string;
  setlists: {
    name: string;
  } | {
    name: string;
  }[] | null;
};

type SetlistItemsForAnalyticsRow = {
  position: number;
  songs:
    | {
        id: string;
        title: string;
      }
    | {
        id: string;
        title: string;
      }[]
    | null;
};

function getNestedSetlistName(row: ShowHistoryRow) {
  if (!row.setlists) {
    return "Untitled set";
  }

  return Array.isArray(row.setlists) ? row.setlists[0]?.name ?? "Untitled set" : row.setlists.name;
}

function getNestedSong(row: SetlistItemsForAnalyticsRow) {
  if (!row.songs) {
    return null;
  }

  return Array.isArray(row.songs) ? row.songs[0] ?? null : row.songs;
}

function sortCounts(map: Map<string, { songId: string; title: string; count: number }>) {
  return Array.from(map.values())
    .sort((left, right) => right.count - left.count || left.title.localeCompare(right.title))
    .slice(0, 5);
}

export async function savePerformedSet(params: {
  setlistId: string;
  actualDurationMinutes: number;
  audienceNotes?: string;
}) {
  const supabase = createServerSupabaseClient();

  const { data: setlist, error: setlistError } = await supabase
    .from("setlists")
    .select("id, name")
    .eq("id", params.setlistId)
    .single();

  if (setlistError) {
    throw new Error(setlistError.message);
  }

  const { data: show, error: showError } = await supabase
    .from("shows")
    .insert({
      title: `Performed: ${(setlist as { name: string }).name}`,
      show_date: new Date().toISOString().slice(0, 10),
      status: "completed",
      target_duration_minutes: params.actualDurationMinutes,
      notes: params.audienceNotes ?? ""
    })
    .select("id")
    .single();

  if (showError) {
    throw new Error(showError.message);
  }

  const { data, error } = await supabase
    .from("show_history")
    .insert({
      show_id: (show as { id: string }).id,
      setlist_id: params.setlistId,
      actual_duration_minutes: params.actualDurationMinutes,
      audience_notes: params.audienceNotes ?? ""
    })
    .select(
      `
        id,
        setlist_id,
        actual_duration_minutes,
        created_at,
        setlists (
          name
        )
      `
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as ShowHistoryRow;

  return {
    id: row.id,
    setlistId: row.setlist_id,
    setlistName: getNestedSetlistName(row),
    performedAt: row.created_at,
    actualDurationMinutes: row.actual_duration_minutes ?? 0
  } satisfies PerformedSetHistory;
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  const supabase = createServerSupabaseClient();

  const { data: historyData, error: historyError } = await supabase
    .from("show_history")
    .select(
      `
        id,
        setlist_id,
        actual_duration_minutes,
        created_at,
        setlists (
          name
        )
      `
    )
    .order("created_at", { ascending: false });

  if (historyError) {
    throw new Error(historyError.message);
  }

  const historyRows = (historyData as ShowHistoryRow[] | null) ?? [];
  const recentPerformedSets: PerformedSetHistory[] = historyRows.slice(0, 6).map((row) => ({
    id: row.id,
    setlistId: row.setlist_id,
    setlistName: getNestedSetlistName(row),
    performedAt: row.created_at,
    actualDurationMinutes: row.actual_duration_minutes ?? 0
  }));

  const totalPerformedSets = historyRows.length;
  const averageSetDurationMinutes =
    totalPerformedSets === 0
      ? 0
      : historyRows.reduce((sum, row) => sum + (row.actual_duration_minutes ?? 0), 0) /
        totalPerformedSets;

  const setlistIds = Array.from(new Set(historyRows.map((row) => row.setlist_id)));

  if (setlistIds.length === 0) {
    return {
      totalPerformedSets,
      averageSetDurationMinutes,
      mostPlayedSongs: [],
      mostCommonOpeners: [],
      mostCommonClosers: [],
      recentPerformedSets
    };
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from("setlist_items")
    .select(
      `
        setlist_id,
        position,
        songs (
          id,
          title
        )
      `
    )
    .in("setlist_id", setlistIds)
    .order("position", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const itemsBySetlist = new Map<string, SetlistItemsForAnalyticsRow[]>();

  for (const row of (itemsData as (SetlistItemsForAnalyticsRow & { setlist_id: string })[] | null) ?? []) {
    const group = itemsBySetlist.get(row.setlist_id) ?? [];
    group.push(row);
    itemsBySetlist.set(row.setlist_id, group);
  }

  const mostPlayedMap = new Map<string, { songId: string; title: string; count: number }>();
  const openerMap = new Map<string, { songId: string; title: string; count: number }>();
  const closerMap = new Map<string, { songId: string; title: string; count: number }>();

  for (const setlistId of setlistIds) {
    const items = (itemsBySetlist.get(setlistId) ?? []).sort((left, right) => left.position - right.position);

    items.forEach((item, index) => {
      const song = getNestedSong(item);

      if (!song) {
        return;
      }

      const played = mostPlayedMap.get(song.id) ?? { songId: song.id, title: song.title, count: 0 };
      played.count += 1;
      mostPlayedMap.set(song.id, played);

      if (index === 0) {
        const opener = openerMap.get(song.id) ?? { songId: song.id, title: song.title, count: 0 };
        opener.count += 1;
        openerMap.set(song.id, opener);
      }

      if (index === items.length - 1) {
        const closer = closerMap.get(song.id) ?? { songId: song.id, title: song.title, count: 0 };
        closer.count += 1;
        closerMap.set(song.id, closer);
      }
    });
  }

  return {
    totalPerformedSets,
    averageSetDurationMinutes,
    mostPlayedSongs: sortCounts(mostPlayedMap),
    mostCommonOpeners: sortCounts(openerMap),
    mostCommonClosers: sortCounts(closerMap),
    recentPerformedSets
  };
}
