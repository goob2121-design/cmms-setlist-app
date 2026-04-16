import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LiveSession } from "@/lib/types";

type LiveSessionRow = {
  id: string;
  setlist_id: string;
  current_item_id: string | null;
  current_position: number;
  is_active: boolean;
  started_at: string;
  updated_at: string;
};

function mapLiveSession(row: LiveSessionRow): LiveSession {
  return {
    id: row.id,
    setlistId: row.setlist_id,
    currentItemId: row.current_item_id,
    currentPosition: row.current_position,
    isActive: row.is_active,
    startedAt: row.started_at,
    updatedAt: row.updated_at
  };
}

export async function getActiveLiveSession(setlistId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("live_sessions")
    .select("id, setlist_id, current_item_id, current_position, is_active, started_at, updated_at")
    .eq("setlist_id", setlistId)
    .eq("is_active", true)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapLiveSession(data as LiveSessionRow) : null;
}

export async function getOrCreateActiveLiveSession(
  setlistId: string,
  initialCurrentItemId: string | null,
  initialCurrentPosition: number
) {
  const existing = await getActiveLiveSession(setlistId);

  if (existing) {
    return existing;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("live_sessions")
    .insert({
      setlist_id: setlistId,
      current_item_id: initialCurrentItemId,
      current_position: initialCurrentPosition,
      is_active: true
    })
    .select("id, setlist_id, current_item_id, current_position, is_active, started_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapLiveSession(data as LiveSessionRow);
}

export async function updateActiveLiveSession(
  setlistId: string,
  values: {
    currentItemId?: string | null;
    currentPosition?: number;
    isActive?: boolean;
  }
) {
  const session = await getOrCreateActiveLiveSession(
    setlistId,
    values.currentItemId ?? null,
    values.currentPosition ?? 0
  );
  const supabase = createServerSupabaseClient();

  const payload: Record<string, string | number | boolean | null> = {};

  if ("currentItemId" in values) {
    payload.current_item_id = values.currentItemId ?? null;
  }

  if (typeof values.currentPosition === "number") {
    payload.current_position = values.currentPosition;
  }

  if (typeof values.isActive === "boolean") {
    payload.is_active = values.isActive;
  }

  const { data, error } = await supabase
    .from("live_sessions")
    .update(payload)
    .eq("id", session.id)
    .select("id, setlist_id, current_item_id, current_position, is_active, started_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapLiveSession(data as LiveSessionRow);
}
