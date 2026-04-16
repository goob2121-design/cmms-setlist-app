"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { GeneratedSetlistOption, SetlistDetail, SetlistItem, Song } from "@/lib/types";

type SetlistBuilderProps = {
  songs: Song[];
  initialSetlists: SetlistDetail[];
};

type BuilderItem = {
  localId: string;
  songId: string;
  title: string;
  key: string;
  tempo: Song["tempo"];
  duration: number;
  singer: string;
  notes: string;
  tags: string[];
  arrangementNotes: string;
  isOptional: boolean;
};

function createBuilderItem(song: Song): BuilderItem {
  return {
    localId: crypto.randomUUID(),
    songId: song.id,
    title: song.title,
    key: song.key,
    tempo: song.tempo,
    duration: song.duration,
    singer: song.singer,
    notes: song.notes,
    tags: song.tags,
    arrangementNotes: "",
    isOptional: false
  };
}

function builderItemsFromSetlist(items: SetlistItem[]): BuilderItem[] {
  return items.map((item) => ({
    localId: item.id,
    songId: item.song.id,
    title: item.song.title,
    key: item.song.key,
    tempo: item.song.tempo,
    duration: item.song.duration,
    singer: item.song.singer,
    notes: item.song.notes,
    tags: item.song.tags,
    arrangementNotes: item.arrangementNotes,
    isOptional: item.isOptional
  }));
}

function moveItem(items: BuilderItem[], fromIndex: number, toIndex: number) {
  const reordered = items.slice();
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  return reordered;
}

export function SetlistBuilder({ songs, initialSetlists }: SetlistBuilderProps) {
  const supabase = useRef(createBrowserSupabaseClient()).current;
  const [savedSetlists, setSavedSetlists] = useState<SetlistDetail[]>(initialSetlists);
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetDurationMinutes, setTargetDurationMinutes] = useState("45");
  const [songSearch, setSongSearch] = useState("");
  const [items, setItems] = useState<BuilderItem[]>([]);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingSetlistId, setLoadingSetlistId] = useState<string | null>(null);
  const [generatedOptions, setGeneratedOptions] = useState<GeneratedSetlistOption[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportingSetlistId, setExportingSetlistId] = useState<string | null>(null);

  const filteredSongs = useMemo(() => {
    const query = songSearch.trim().toLowerCase();

    if (!query) {
      return songs;
    }

    return songs.filter((song) => {
      const haystacks = [song.title, song.key, song.singer, song.tags.join(" "), song.notes];
      return haystacks.some((value) => value.toLowerCase().includes(query));
    });
  }, [songSearch, songs]);

  const totalDuration = useMemo(
    () => items.reduce((total, item) => total + item.duration, 0),
    [items]
  );

  const conflictIndices = useMemo(() => {
    const indices = new Set<number>();

    for (let index = 0; index < items.length; index += 1) {
      const previous = items[index - 1];
      const current = items[index];

      if (previous && previous.key.trim().toLowerCase() === current.key.trim().toLowerCase()) {
        indices.add(index - 1);
        indices.add(index);
      }
    }

    return indices;
  }, [items]);

  useEffect(() => {
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
    }

    async function refreshActiveSetlist() {
      if (!activeSetlistId) {
        return;
      }

      const response = await fetch(`/api/setlists/${activeSetlistId}`, {
        method: "GET",
        cache: "no-store"
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to refresh the active setlist.");
      }

      setName(payload.name);
      setDescription(payload.description ?? "");
      setItems(builderItemsFromSetlist(payload.items ?? []));
    }

    const channel = supabase
      .channel("setlist-builder-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "setlists" },
        async () => {
          try {
            await refreshSetlists();
            await refreshActiveSetlist();
            setMessage("A live update from another device was applied.");
          } catch (refreshError) {
            setError(
              refreshError instanceof Error
                ? refreshError.message
                : "Unable to refresh setlists in real time."
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "setlist_items" },
        async () => {
          try {
            await refreshSetlists();
            await refreshActiveSetlist();
            setMessage("Setlist order changed on another device.");
          } catch (refreshError) {
            setError(
              refreshError instanceof Error
                ? refreshError.message
                : "Unable to refresh setlist items in real time."
            );
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
              setMessage("Song updates from another device were applied.");
            }
          } catch (refreshError) {
            setError(
              refreshError instanceof Error
                ? refreshError.message
                : "Unable to refresh songs in real time."
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeSetlistId, supabase]);

  function resetBuilder() {
    setActiveSetlistId(null);
    setName("");
    setDescription("");
    setItems([]);
    setGeneratedOptions([]);
    setMessage(null);
    setError(null);
  }

  function addSong(song: Song) {
    setItems((current) => [...current, createBuilderItem(song)]);
    setMessage(null);
    setError(null);
  }

  function removeItem(localId: string) {
    setItems((current) => current.filter((item) => item.localId !== localId));
  }

  function shiftItem(localId: string, direction: "up" | "down") {
    setItems((current) => {
      const currentIndex = current.findIndex((item) => item.localId === localId);

      if (currentIndex === -1) {
        return current;
      }

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      return moveItem(current, currentIndex, targetIndex);
    });
  }

  function updateItem(localId: string, patch: Partial<BuilderItem>) {
    setItems((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...patch } : item))
    );
  }

  async function loadSetlist(setlistId: string) {
    setLoadingSetlistId(setlistId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/setlists/${setlistId}`, {
        method: "GET",
        cache: "no-store"
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load setlist.");
      }

      setActiveSetlistId(payload.id);
      setName(payload.name);
      setDescription(payload.description ?? "");
      setItems(builderItemsFromSetlist(payload.items ?? []));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load setlist.");
    } finally {
      setLoadingSetlistId(null);
    }
  }

  async function saveSetlist() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        status: "draft" as const,
        items: items.map((item, index) => ({
          songId: item.songId,
          position: index,
          isOptional: item.isOptional,
          arrangementNotes: item.arrangementNotes
        }))
      };

      const response = await fetch(activeSetlistId ? `/api/setlists/${activeSetlistId}` : "/api/setlists", {
        method: activeSetlistId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const saved = await response.json();

      if (!response.ok) {
        throw new Error(saved.error ?? "Unable to save setlist.");
      }

      setActiveSetlistId(saved.id);
      setName(saved.name);
      setDescription(saved.description ?? "");
      setItems(builderItemsFromSetlist(saved.items ?? []));
      setSavedSetlists((current) => {
        const next = current.filter((setlist) => setlist.id !== saved.id);
        return [saved, ...next];
      });
      setMessage(activeSetlistId ? "Setlist updated." : "Setlist saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save setlist.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSetlist(setlistId: string) {
    const confirmed = window.confirm("Delete this saved setlist?");

    if (!confirmed) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/setlists/${setlistId}`, {
        method: "DELETE"
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete setlist.");
      }

      setSavedSetlists((current) => current.filter((setlist) => setlist.id !== setlistId));

      if (activeSetlistId === setlistId) {
        resetBuilder();
      }

      setMessage("Setlist deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete setlist.");
    }
  }

  async function exportSetlist(
    setlistId: string,
    mode: "facebook" | "playlist" | "print" | "pdf"
  ) {
    setExportingSetlistId(setlistId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ setlistId })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to export setlist.");
      }

      if (mode === "facebook") {
        await navigator.clipboard.writeText(payload.facebookText);
        setMessage(`Facebook post text copied for ${payload.setlistName}.`);
      }

      if (mode === "playlist") {
        await navigator.clipboard.writeText(payload.playlistText);
        setMessage(`Playlist text copied for ${payload.setlistName}.`);
      }

      if (mode === "print") {
        window.open(payload.printableUrl, "_blank", "noopener,noreferrer");
        setMessage(`Printable version opened for ${payload.setlistName}.`);
      }

      if (mode === "pdf") {
        window.open(payload.pdfUrl, "_blank", "noopener,noreferrer");
        setMessage(`PDF export view opened for ${payload.setlistName}.`);
      }
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Unable to export setlist.");
    } finally {
      setExportingSetlistId(null);
    }
  }

  function handleDrop(targetLocalId: string) {
    if (!draggedItemId || draggedItemId === targetLocalId) {
      return;
    }

    setItems((current) => {
      const fromIndex = current.findIndex((item) => item.localId === draggedItemId);
      const toIndex = current.findIndex((item) => item.localId === targetLocalId);

      if (fromIndex === -1 || toIndex === -1) {
        return current;
      }

      return moveItem(current, fromIndex, toIndex);
    });
    setDraggedItemId(null);
  }

  async function generateOptions() {
    setGenerating(true);
    setGeneratedOptions([]);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/generator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          totalTimeMinutes: Number(targetDurationMinutes),
          variationCount: 3
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to generate setlists.");
      }

      setGeneratedOptions(payload.options ?? []);

      if (!payload.options || payload.options.length === 0) {
        setError("No usable setlist options were generated from the current song library.");
      }
    } catch (generationError) {
      setError(
        generationError instanceof Error ? generationError.message : "Unable to generate setlists."
      );
    } finally {
      setGenerating(false);
    }
  }

  function applyGeneratedOption(option: GeneratedSetlistOption) {
    setActiveSetlistId(null);
    setItems(option.songs.map((song) => createBuilderItem(song)));
    setGeneratedOptions((current) =>
      current.map((entry) => (entry.id === option.id ? option : entry))
    );
    setName((current) => current || `${option.label} - ${option.targetDurationMinutes} min`);
    setDescription(`Generated for a ${option.targetDurationMinutes}-minute target.`);
    setMessage(`${option.label} loaded into the current builder.`);
    setError(null);
  }

  return (
    <section className="stack-lg">
      <article className="hero-panel">
        <div className="builder-topbar">
          <div className="stack-sm">
            <p className="eyebrow">Setlist Builder</p>
            <h2>{activeSetlistId ? "Edit saved setlist" : "Build a new setlist"}</h2>
            <p className="page-description">
              Add songs from the library, drag them into order, and save the set with timing and
              key-flow feedback.
            </p>
          </div>

          <div className="builder-stat-grid">
            <div className="metric-card compact-card">
              <p className="metric-label">Total duration</p>
              <p className="metric-value">{totalDuration.toFixed(1)} min</p>
            </div>
            <div className="metric-card compact-card">
              <p className="metric-label">Songs in set</p>
              <p className="metric-value">{items.length}</p>
            </div>
            <div className="metric-card compact-card">
              <p className="metric-label">Key warnings</p>
              <p className="metric-value">{conflictIndices.size > 0 ? conflictIndices.size : 0}</p>
            </div>
          </div>
        </div>

        <div className="builder-form-grid">
          <label className="field-group">
            <span>Setlist name</span>
            <input
              className="text-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Saturday second set"
            />
          </label>

          <label className="field-group">
            <span>Description</span>
            <input
              className="text-input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Festival set with strong opener and encore room"
            />
          </label>

          <label className="field-group">
            <span>Target duration</span>
            <input
              className="text-input"
              type="number"
              min="5"
              max="240"
              step="1"
              value={targetDurationMinutes}
              onChange={(event) => setTargetDurationMinutes(event.target.value)}
              placeholder="45"
            />
          </label>
        </div>

        <div className="form-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={generateOptions}
            disabled={generating || !targetDurationMinutes}
          >
            {generating ? "Generating..." : "Generate setlist"}
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={saveSetlist}
            disabled={saving || !name.trim() || items.length === 0}
          >
            {saving ? "Saving..." : activeSetlistId ? "Update setlist" : "Save setlist"}
          </button>
          <button className="secondary-button" type="button" onClick={resetBuilder}>
            New setlist
          </button>
        </div>

        {message ? <p className="form-message success-message">{message}</p> : null}
        {error ? <p className="form-message error-message">{error}</p> : null}
      </article>

      {generatedOptions.length > 0 ? (
        <article className="section-card stack-sm">
          <div className="card-row">
            <h2>Generated options</h2>
            <span className="status-pill">{generatedOptions.length} options</span>
          </div>

          <div className="generated-options-grid">
            {generatedOptions.map((option) => (
              <article key={option.id} className="generated-option-card">
                <div className="stack-xs">
                  <div className="card-row">
                    <strong>{option.label}</strong>
                    <span className="queue-key">{option.totalDurationMinutes.toFixed(1)} min</span>
                  </div>
                  <p className="cell-note">
                    Target {option.targetDurationMinutes} min | {option.songs.length} songs
                  </p>
                </div>

                <div className="generated-option-song-list">
                  {option.songs.map((song, index) => (
                    <div key={`${option.id}-${song.id}-${index}`} className="generated-option-song">
                      <span>{index + 1}. {song.title}</span>
                      <span className="cell-note">
                        {song.key} | {song.tempo} | {song.singer}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() => applyGeneratedOption(option)}
                >
                  Use this option
                </button>
              </article>
            ))}
          </div>
        </article>
      ) : null}

      <div className="setlist-builder-grid">
        <article className="section-card stack-sm">
          <div className="card-row">
            <h2>Song database</h2>
            <span className="status-pill">{songs.length} songs</span>
          </div>

          <label className="field-group">
            <span>Search songs</span>
            <input
              className="text-input"
              value={songSearch}
              onChange={(event) => setSongSearch(event.target.value)}
              placeholder="Title, key, singer, tag"
            />
          </label>

          <div className="song-picker-list">
            {filteredSongs.map((song) => (
              <button key={song.id} className="song-picker-item" type="button" onClick={() => addSong(song)}>
                <div className="stack-xs">
                  <strong>{song.title}</strong>
                  <p className="cell-note">
                    {song.key} | {song.tempo} | {song.duration} min | {song.singer}
                  </p>
                </div>
                <span className="queue-key">Add</span>
              </button>
            ))}
          </div>
        </article>

        <article className="section-card stack-sm">
          <div className="card-row">
            <h2>Current set</h2>
            <span className="status-pill">{items.length} songs</span>
          </div>

          <div className="builder-list">
            {items.length === 0 ? (
              <div className="empty-state">
                <p>Add songs from the library to start this setlist.</p>
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.localId}
                  draggable
                  onDragStart={() => setDraggedItemId(item.localId)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(item.localId)}
                  onDragEnd={() => setDraggedItemId(null)}
                  className={
                    conflictIndices.has(index)
                      ? "builder-item builder-item-conflict"
                      : "builder-item"
                  }
                >
                  <div className="builder-item-header">
                    <div className="stack-xs">
                      <div className="builder-item-title-row">
                        <span className="drag-handle">::</span>
                        <strong>{index + 1}. {item.title}</strong>
                      </div>
                      <p className="cell-note">
                        {item.tempo} | {item.duration} min | {item.singer}
                      </p>
                    </div>

                    <div className="builder-item-meta">
                      <span className="queue-key">{item.key}</span>
                      <button
                        className="ghost-button compact-button"
                        type="button"
                        onClick={() => shiftItem(item.localId, "up")}
                        disabled={index === 0}
                      >
                        Up
                      </button>
                      <button
                        className="ghost-button compact-button"
                        type="button"
                        onClick={() => shiftItem(item.localId, "down")}
                        disabled={index === items.length - 1}
                      >
                        Down
                      </button>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => removeItem(item.localId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {conflictIndices.has(index) ? (
                    <p className="conflict-text">Key repeats with the neighboring song.</p>
                  ) : null}

                  <label className="field-group">
                    <span>Arrangement notes</span>
                    <input
                      className="text-input"
                      value={item.arrangementNotes}
                      onChange={(event) =>
                        updateItem(item.localId, { arrangementNotes: event.target.value })
                      }
                      placeholder="Intro cue, cutoff, encore note"
                    />
                  </label>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <article className="section-card stack-sm">
        <div className="card-row">
          <h2>Saved setlists</h2>
          <span className="status-pill">{savedSetlists.length} saved</span>
        </div>

        <div className="saved-setlists-grid">
          {savedSetlists.length === 0 ? (
            <div className="empty-state">
              <p>No saved setlists yet.</p>
            </div>
          ) : (
            savedSetlists.map((setlist) => (
              <article key={setlist.id} className="saved-setlist-card">
                <div className="stack-xs">
                  <div className="card-row">
                    <strong>{setlist.name}</strong>
                    <span className="status-pill">{setlist.status}</span>
                  </div>
                  <p className="cell-note">{setlist.description || "No description"}</p>
                  <p className="cell-note">
                    {setlist.songCount} songs | {setlist.totalDurationMinutes.toFixed(1)} min
                  </p>
                </div>

                <div className="table-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={loadingSetlistId === setlist.id}
                    onClick={() => loadSetlist(setlist.id)}
                  >
                    {loadingSetlistId === setlist.id ? "Loading..." : "Open"}
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => handleDeleteSetlist(setlist.id)}
                  >
                    Delete
                  </button>
                </div>

                <div className="table-actions">
                  <button
                    className="ghost-button compact-button"
                    type="button"
                    disabled={exportingSetlistId === setlist.id}
                    onClick={() => exportSetlist(setlist.id, "facebook")}
                  >
                    Facebook text
                  </button>
                  <button
                    className="ghost-button compact-button"
                    type="button"
                    disabled={exportingSetlistId === setlist.id}
                    onClick={() => exportSetlist(setlist.id, "playlist")}
                  >
                    Playlist
                  </button>
                  <button
                    className="ghost-button compact-button"
                    type="button"
                    disabled={exportingSetlistId === setlist.id}
                    onClick={() => exportSetlist(setlist.id, "print")}
                  >
                    Printable
                  </button>
                  <button
                    className="ghost-button compact-button"
                    type="button"
                    disabled={exportingSetlistId === setlist.id}
                    onClick={() => exportSetlist(setlist.id, "pdf")}
                  >
                    Export PDF
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
