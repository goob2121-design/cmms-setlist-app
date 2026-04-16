"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { LiveSession, SetlistDetail, Song } from "@/lib/types";

type LiveModePanelProps = {
  setlists: SetlistDetail[];
  songs: Song[];
};

type LiveItem = {
  localId: string;
  song: Song;
  arrangementNotes: string;
};

type Suggestion = {
  song: Song;
  reason: string;
};

function createLiveItems(setlist: SetlistDetail): LiveItem[] {
  return setlist.items.map((item) => ({
    localId: item.id,
    song: item.song,
    arrangementNotes: item.arrangementNotes
  }));
}

function moveItem(items: LiveItem[], fromIndex: number, toIndex: number) {
  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function totalDuration(items: LiveItem[]) {
  return items.reduce((sum, item) => sum + item.song.duration, 0);
}

function buildAddSuggestions(items: LiveItem[], songs: Song[]) {
  const usedIds = new Set(items.map((item) => item.song.id));
  const lastSong = items[items.length - 1]?.song;
  const singerCounts = new Map<string, number>();

  for (const item of items) {
    singerCounts.set(item.song.singer, (singerCounts.get(item.song.singer) ?? 0) + 1);
  }

  return songs
    .filter((song) => !usedIds.has(song.id))
    .map((song) => {
      let score = 0;
      const reasons: string[] = [];
      const singerCount = singerCounts.get(song.singer) ?? 0;
      const maxSingerCount = Math.max(...Array.from(singerCounts.values()), 0);

      if (song.duration >= 3 && song.duration <= 6) {
        score += 7;
        reasons.push("fits a quick time extension");
      }

      if (lastSong && lastSong.key.toLowerCase() !== song.key.toLowerCase()) {
        score += 6;
        reasons.push("avoids repeating the current key");
      }

      if (lastSong && lastSong.tempo !== song.tempo) {
        score += 4;
        reasons.push("changes the tempo feel");
      }

      if (singerCount < maxSingerCount || maxSingerCount === 0) {
        score += 5;
        reasons.push("helps rotate singers");
      }

      return {
        song,
        score,
        reason: reasons.slice(0, 2).join(" and ")
      };
    })
    .sort((left, right) => right.score - left.score || left.song.title.localeCompare(right.song.title))
    .slice(0, 3)
    .map(({ song, reason }) => ({
      song,
      reason: reason || "balances the set"
    }));
}

function buildCutSuggestions(items: LiveItem[]) {
  if (items.length === 0) {
    return [];
  }

  const currentDuration = totalDuration(items);

  return items
    .map((item, index) => {
      let score = 0;
      const reasons: string[] = [];

      if (index > 0) {
        score += 4;
      }

      if (index >= items.length - 3) {
        score += 7;
        reasons.push("near the end of the set");
      }

      if (item.song.duration >= 4 && item.song.duration <= 6) {
        score += 5;
        reasons.push("cuts about five minutes cleanly");
      }

      const previous = items[index - 1]?.song;
      const next = items[index + 1]?.song;

      if (previous && next && previous.key.toLowerCase() !== next.key.toLowerCase()) {
        score += 3;
        reasons.push("keeps neighboring keys varied");
      }

      const resultingDuration = currentDuration - item.song.duration;
      score += Math.max(0, 6 - Math.abs(5 - item.song.duration));

      return {
        item,
        index,
        score,
        resultingDuration,
        reason: reasons.slice(0, 2).join(" and ")
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

function serializeLiveItems(items: LiveItem[]) {
  return items.map((item, index) => ({
    songId: item.song.id,
    position: index,
    isOptional: false,
    arrangementNotes: item.arrangementNotes
  }));
}

export function LiveModePanel({ setlists, songs }: LiveModePanelProps) {
  const supabase = useRef(createBrowserSupabaseClient()).current;
  const [savedSetlists, setSavedSetlists] = useState<SetlistDetail[]>(setlists);
  const [activeSetlistId, setActiveSetlistId] = useState<string>(setlists[0]?.id ?? "");
  const [items, setItems] = useState<LiveItem[]>(() =>
    setlists[0] ? createLiveItems(setlists[0]) : []
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    setlists[0] ? `Loaded ${setlists[0].name}.` : "Load a setlist and you are ready to run the show."
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSavingHistory, setIsSavingHistory] = useState(false);

  const currentSong = items[currentIndex]?.song ?? null;
  const runtime = useMemo(() => totalDuration(items), [items]);
  const addSuggestions = useMemo(() => buildAddSuggestions(items, songs), [items, songs]);
  const cutSuggestions = useMemo(() => buildCutSuggestions(items), [items]);

  async function refreshSetlists() {
    const response = await fetch("/api/setlists", {
      method: "GET",
      cache: "no-store"
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to refresh setlists.");
    }

    setSavedSetlists(payload);
    return payload as SetlistDetail[];
  }

  async function refreshActiveSetlist(targetSetlistId = activeSetlistId) {
    if (!targetSetlistId) {
      return null;
    }

    const response = await fetch(`/api/setlists/${targetSetlistId}`, {
      method: "GET",
      cache: "no-store"
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to refresh the active setlist.");
    }

    setItems(createLiveItems(payload));
    return payload as SetlistDetail;
  }

  async function ensureLiveSession(targetSetlistId: string, nextIndex = 0) {
    const response = await fetch("/api/live", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        setlistId: targetSetlistId,
        currentPosition: nextIndex,
        currentItemId: null,
        action: "activate",
        payload: {}
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to create the live session.");
    }

    setLiveSession(payload.session);
    return payload.session as LiveSession;
  }

  async function syncCurrentPosition(targetSetlistId: string, nextIndex: number) {
    const response = await fetch("/api/live", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        setlistId: targetSetlistId,
        currentPosition: nextIndex,
        currentItemId: null,
        action: "advance",
        payload: {}
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to sync the current song.");
    }

    setLiveSession(payload.session);
  }

  async function persistQueue(
    targetSetlistId: string,
    nextItems: LiveItem[],
    nextStatusMessage: string,
    nextIndex = currentIndex
  ) {
    const currentSetlist = savedSetlists.find((entry) => entry.id === targetSetlistId);
    const response = await fetch(`/api/setlists/${targetSetlistId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: currentSetlist?.name ?? "Live set",
        description: currentSetlist?.description ?? "",
        status: currentSetlist?.status ?? "live",
        items: serializeLiveItems(nextItems)
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to sync the live queue.");
    }

    const updated = payload as SetlistDetail;
    setSavedSetlists((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    setItems(createLiveItems(updated));
    setStatusMessage(nextStatusMessage);
    await syncCurrentPosition(targetSetlistId, Math.min(nextIndex, Math.max(updated.items.length - 1, 0)));
  }

  useEffect(() => {
    if (!activeSetlistId) {
      return;
    }

    void ensureLiveSession(activeSetlistId, 0).catch((error) => {
      setSyncError(error instanceof Error ? error.message : "Unable to start live sync.");
    });
  }, [activeSetlistId]);

  useEffect(() => {
    const channel = supabase
      .channel("live-mode-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "setlists" },
        async () => {
          try {
            await refreshSetlists();
            if (activeSetlistId) {
              await refreshActiveSetlist();
            }
          } catch (error) {
            setSyncError(error instanceof Error ? error.message : "Unable to sync setlists.");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "setlist_items" },
        async () => {
          try {
            if (activeSetlistId) {
              await refreshActiveSetlist();
            }
          } catch (error) {
            setSyncError(error instanceof Error ? error.message : "Unable to sync the live queue.");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "songs" },
        async () => {
          try {
            if (activeSetlistId) {
              await refreshActiveSetlist();
            }
          } catch (error) {
            setSyncError(error instanceof Error ? error.message : "Unable to sync song updates.");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions" },
        async () => {
          if (!activeSetlistId) {
            return;
          }

          try {
            const response = await fetch(`/api/live?setlistId=${encodeURIComponent(activeSetlistId)}`, {
              method: "GET",
              cache: "no-store"
            });
            const payload = await response.json();

            if (!response.ok) {
              throw new Error(payload.error ?? "Unable to sync the current song.");
            }

            if (payload.session) {
              setLiveSession(payload.session);
              setCurrentIndex(payload.session.currentPosition ?? 0);
            }
          } catch (error) {
            setSyncError(error instanceof Error ? error.message : "Unable to sync the current song.");
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeSetlistId, supabase]);

  function loadSetlist(setlistId: string) {
    const nextSetlist = savedSetlists.find((entry) => entry.id === setlistId);

    if (!nextSetlist) {
      return;
    }

    setActiveSetlistId(setlistId);
    setItems(createLiveItems(nextSetlist));
    setCurrentIndex(0);
    setStatusMessage(`Loaded ${nextSetlist.name}.`);
    setSyncError(null);

    void ensureLiveSession(setlistId, 0).catch((error) => {
      setSyncError(error instanceof Error ? error.message : "Unable to start live sync.");
    });
  }

  async function savePerformanceHistory() {
    if (!activeSetlistId || items.length === 0) {
      return;
    }

    setIsSavingHistory(true);
    setSyncError(null);

    try {
      const response = await fetch("/api/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          setlistId: activeSetlistId,
          actualDurationMinutes: Math.round(runtime),
          audienceNotes: `Saved from live mode at song ${Math.min(currentIndex + 1, items.length)}.`
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save performed set.");
      }

      setStatusMessage(`Saved performance history for ${payload.setlistName}.`);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Unable to save performed set.");
    } finally {
      setIsSavingHistory(false);
    }
  }

  function advanceSong() {
    const nextIndex = Math.min(currentIndex + 1, Math.max(items.length - 1, 0));
    setCurrentIndex(nextIndex);
    setStatusMessage(
      nextIndex === currentIndex ? "You are already on the last song." : "Advanced to the next song."
    );

    if (!activeSetlistId) {
      return;
    }

    void syncCurrentPosition(activeSetlistId, nextIndex).catch((error) => {
      setSyncError(error instanceof Error ? error.message : "Unable to sync the current song.");
    });
  }

  function addSong(song: Song) {
    if (!activeSetlistId) {
      return;
    }

    const newItem: LiveItem = {
      localId: `${song.id}-${crypto.randomUUID()}`,
      song,
      arrangementNotes: ""
    };
    const nextItems = [...items, newItem];

    setItems(nextItems);
    setStatusMessage(`Added ${song.title}.`);

    void persistQueue(activeSetlistId, nextItems, `Added ${song.title} to the live queue.`).catch((error) => {
      setSyncError(error instanceof Error ? error.message : "Unable to sync the updated queue.");
    });
  }

  function cutSong(index: number, title: string) {
    if (!activeSetlistId) {
      return;
    }

    const nextItems = items.filter((_, itemIndex) => itemIndex !== index);
    const nextIndex =
      nextItems.length === 0 ? 0 : index < currentIndex ? currentIndex - 1 : Math.min(currentIndex, nextItems.length - 1);

    setItems(nextItems);
    setCurrentIndex(nextIndex);
    setStatusMessage(`Cut ${title} from the live set.`);

    void persistQueue(activeSetlistId, nextItems, `Cut ${title} from the live queue.`, nextIndex).catch(
      (error) => {
        setSyncError(error instanceof Error ? error.message : "Unable to sync the updated queue.");
      }
    );
  }

  function shiftItem(index: number, direction: "up" | "down") {
    if (!activeSetlistId) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const nextItems = moveItem(items, index, targetIndex);
    const nextCurrentIndex =
      currentIndex === index
        ? targetIndex
        : direction === "up" && currentIndex === targetIndex
          ? currentIndex + 1
          : direction === "down" && currentIndex === targetIndex
            ? currentIndex - 1
            : currentIndex;

    setItems(nextItems);
    setCurrentIndex(nextCurrentIndex);

    void persistQueue(activeSetlistId, nextItems, "Reordered the live queue.", nextCurrentIndex).catch(
      (error) => {
        setSyncError(error instanceof Error ? error.message : "Unable to sync the updated queue.");
      }
    );
  }

  function handleDrop(targetId: string) {
    if (!draggedItemId || draggedItemId === targetId || !activeSetlistId) {
      return;
    }

    const fromIndex = items.findIndex((item) => item.localId === draggedItemId);
    const toIndex = items.findIndex((item) => item.localId === targetId);

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    const nextItems = moveItem(items, fromIndex, toIndex);
    const nextCurrentIndex =
      currentIndex === fromIndex
        ? toIndex
        : fromIndex < currentIndex && toIndex >= currentIndex
          ? currentIndex - 1
          : fromIndex > currentIndex && toIndex <= currentIndex
            ? currentIndex + 1
            : currentIndex;

    setItems(nextItems);
    setCurrentIndex(nextCurrentIndex);
    setDraggedItemId(null);

    void persistQueue(activeSetlistId, nextItems, "Reordered the live queue.", nextCurrentIndex).catch(
      (error) => {
        setSyncError(error instanceof Error ? error.message : "Unable to sync the updated queue.");
      }
    );
  }

  return (
    <section className="live-mode-screen">
      <article className="live-stage-header">
        <div className="stack-sm">
          <p className="eyebrow">Live Performance Mode</p>
          <h1>{savedSetlists.find((entry) => entry.id === activeSetlistId)?.name ?? "No setlist loaded"}</h1>
          <p className="live-status">{statusMessage}</p>
          {syncError ? <p className="form-message error-message">{syncError}</p> : null}
          {liveSession ? <p className="cell-note">Realtime synced at {new Date(liveSession.updatedAt).toLocaleTimeString()}</p> : null}
        </div>

        <div className="live-header-controls">
          <label className="field-group live-select-group">
            <span>Choose setlist</span>
            <select
              className="text-input"
              value={activeSetlistId}
              onChange={(event) => loadSetlist(event.target.value)}
            >
              {savedSetlists.length === 0 ? <option value="">No saved setlists</option> : null}
              {savedSetlists.map((setlist) => (
                <option key={setlist.id} value={setlist.id}>
                  {setlist.name}
                </option>
              ))}
            </select>
          </label>

          <div className="live-stat-pills">
            <span className="live-pill">{items.length} songs</span>
            <span className="live-pill">{runtime.toFixed(1)} min</span>
            <span className="live-pill">
              {currentSong ? `Song ${currentIndex + 1}` : "Waiting"}
            </span>
          </div>
        </div>
      </article>

      <article className="live-current-focus">
        {currentSong ? (
          <>
            <div className="stack-sm">
              <p className="eyebrow">Current Song</p>
              <h2>{currentSong.title}</h2>
              <p className="live-current-meta">
                {currentSong.key} | {currentSong.tempo} | {currentSong.duration} min | {currentSong.singer}
              </p>
            </div>

            <div className="live-notes-panel">
              <p className="live-note-label">Stage notes</p>
              <p className="live-note-body">{currentSong.notes || "No song notes for this tune."}</p>
              <p className="cell-note">
                {items[currentIndex]?.arrangementNotes || "No set-specific arrangement notes."}
              </p>
            </div>

            <div className="live-action-grid">
              <button className="primary-button live-primary-button" type="button" onClick={advanceSong}>
                Next song
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  const suggestion = addSuggestions[0];
                  if (suggestion) {
                    addSong(suggestion.song);
                  }
                }}
                disabled={addSuggestions.length === 0}
              >
                Add 5 minutes
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  const suggestion = cutSuggestions[0];
                  if (suggestion) {
                    cutSong(suggestion.index, suggestion.item.song.title);
                  }
                }}
                disabled={cutSuggestions.length === 0}
              >
                Cut 5 minutes
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={savePerformanceHistory}
                disabled={isSavingHistory || items.length === 0}
              >
                {isSavingHistory ? "Saving set..." : "Save performed set"}
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>Load a saved setlist to begin live mode.</p>
          </div>
        )}
      </article>

      <div className="live-side-grid">
        <article className="section-card stack-sm">
          <div className="card-row">
            <h2>Add 5 minutes</h2>
            <span className="status-pill">{addSuggestions.length} ideas</span>
          </div>

          <div className="live-suggestion-list">
            {addSuggestions.length === 0 ? (
              <div className="empty-state">
                <p>No quick add suggestions right now.</p>
              </div>
            ) : (
              addSuggestions.map((suggestion) => (
                <div key={suggestion.song.id} className="live-suggestion-card">
                  <div className="stack-xs">
                    <strong>{suggestion.song.title}</strong>
                    <p className="cell-note">
                      {suggestion.song.key} | {suggestion.song.tempo} | {suggestion.song.duration} min
                    </p>
                    <p className="cell-note">{suggestion.reason}</p>
                  </div>
                  <button
                    className="ghost-button compact-button"
                    type="button"
                    onClick={() => addSong(suggestion.song)}
                  >
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="section-card stack-sm">
          <div className="card-row">
            <h2>Cut 5 minutes</h2>
            <span className="status-pill">{cutSuggestions.length} options</span>
          </div>

          <div className="live-suggestion-list">
            {cutSuggestions.length === 0 ? (
              <div className="empty-state">
                <p>No clean cut suggestions right now.</p>
              </div>
            ) : (
              cutSuggestions.map((suggestion) => (
                <div key={suggestion.item.localId} className="live-suggestion-card">
                  <div className="stack-xs">
                    <strong>{suggestion.item.song.title}</strong>
                    <p className="cell-note">
                      {suggestion.item.song.key} | {suggestion.item.song.duration} min
                    </p>
                    <p className="cell-note">
                      {suggestion.reason || "A clean cut candidate"} | New runtime {suggestion.resultingDuration.toFixed(1)} min
                    </p>
                  </div>
                  <button
                    className="ghost-button compact-button"
                    type="button"
                    onClick={() => cutSong(suggestion.index, suggestion.item.song.title)}
                  >
                    Cut
                  </button>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <article className="live-queue-card">
        <div className="card-row">
          <h2>Live Queue</h2>
          <span className="status-pill">Drag or tap move</span>
        </div>

        <div className="live-queue-list">
          {items.map((item, index) => {
            const isCurrent = index === currentIndex;

            return (
              <div
                key={item.localId}
                draggable
                onDragStart={() => setDraggedItemId(item.localId)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(item.localId)}
                onDragEnd={() => setDraggedItemId(null)}
                className={isCurrent ? "live-queue-item current-live-item" : "live-queue-item"}
              >
                <div className="live-queue-main">
                  <button
                    className={isCurrent ? "queue-position active-position" : "queue-position"}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(index);
                      if (activeSetlistId) {
                        void syncCurrentPosition(activeSetlistId, index).catch((error) => {
                          setSyncError(
                            error instanceof Error ? error.message : "Unable to sync the current song."
                          );
                        });
                      }
                    }}
                  >
                    {index + 1}
                  </button>

                  <div className="stack-xs">
                    <p className="queue-title">{item.song.title}</p>
                    <p className="cell-note">
                      {item.song.key} | {item.song.tempo} | {item.song.duration} min | {item.song.singer}
                    </p>
                    <p className="cell-note">{item.song.notes || "No notes."}</p>
                  </div>
                </div>

                <div className="live-queue-actions">
                  <span className="queue-key">{item.song.key}</span>
                  <button
                    className="ghost-button compact-button"
                    type="button"
                    onClick={() => shiftItem(index, "up")}
                    disabled={index === 0}
                  >
                    Up
                  </button>
                  <button
                    className="ghost-button compact-button"
                    type="button"
                    onClick={() => shiftItem(index, "down")}
                    disabled={index === items.length - 1}
                  >
                    Down
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
