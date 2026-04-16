"use client";

import { useEffect, useMemo, useState } from "react";
import type { Song, SongFormValues, Tempo } from "@/lib/types";

const emptySongForm: SongFormValues = {
  title: "",
  key: "",
  tempo: "medium",
  duration: 3,
  singer: "",
  notes: "",
  tags: []
};

const tempoOptions: Tempo[] = ["slow", "medium", "fast"];

type SongLibraryManagerProps = {
  initialSongs: Song[];
};

type FormState = {
  title: string;
  key: string;
  tempo: Tempo;
  duration: string;
  singer: string;
  notes: string;
  tags: string;
};

function toFormState(song: SongFormValues): FormState {
  return {
    title: song.title,
    key: song.key,
    tempo: song.tempo,
    duration: String(song.duration),
    singer: song.singer,
    notes: song.notes,
    tags: song.tags.join(", ")
  };
}

function toPayload(formState: FormState): SongFormValues {
  return {
    title: formState.title.trim(),
    key: formState.key.trim(),
    tempo: formState.tempo,
    duration: Number(formState.duration),
    singer: formState.singer.trim(),
    notes: formState.notes.trim(),
    tags: formState.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  };
}

export function SongLibraryManager({ initialSongs }: SongLibraryManagerProps) {
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(toFormState(emptySongForm));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editingSong = useMemo(
    () => songs.find((song) => song.id === editingSongId) ?? null,
    [editingSongId, songs]
  );

  useEffect(() => {
    if (!editingSong) {
      setFormState(toFormState(emptySongForm));
      return;
    }

    setFormState(toFormState(editingSong));
  }, [editingSong]);

  async function refreshSongs() {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/songs", {
        method: "GET",
        cache: "no-store"
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load songs.");
      }

      setSongs(payload);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to load songs.");
    } finally {
      setIsRefreshing(false);
    }
  }

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }

  function resetForm() {
    setEditingSongId(null);
    setFormState(toFormState(emptySongForm));
    setError(null);
    setMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const payload = toPayload(formState);
      const endpoint = editingSongId ? `/api/songs/${editingSongId}` : "/api/songs";
      const method = editingSongId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const responsePayload = await response.json();

      if (!response.ok) {
        throw new Error(responsePayload.error ?? "Unable to save song.");
      }

      if (editingSongId) {
        setSongs((current) =>
          current.map((song) => (song.id === responsePayload.id ? responsePayload : song))
        );
        setMessage("Song updated.");
      } else {
        setSongs((current) =>
          [...current, responsePayload].sort((left, right) => left.title.localeCompare(right.title))
        );
        setMessage("Song added.");
      }

      setEditingSongId(null);
      setFormState(toFormState(emptySongForm));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save song.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(songId: string) {
    const confirmed = window.confirm("Delete this song from the library?");

    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: "DELETE"
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete song.");
      }

      setSongs((current) => current.filter((song) => song.id !== songId));

      if (editingSongId === songId) {
        resetForm();
      }

      setMessage("Song deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete song.");
    }
  }

  return (
    <section className="song-library-layout">
      <article className="section-card stack-sm">
        <div className="card-row">
          <h2>{editingSongId ? "Edit song" : "Add song"}</h2>
          {editingSongId ? (
            <button className="ghost-button" type="button" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>

        <form className="song-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>Title</span>
            <input
              className="text-input"
              value={formState.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Song title"
              required
            />
          </label>

          <div className="song-form-row">
            <label className="field-group">
              <span>Key</span>
              <input
                className="text-input"
                value={formState.key}
                onChange={(event) => updateField("key", event.target.value)}
                placeholder="G, A, Bm"
                required
              />
            </label>

            <label className="field-group">
              <span>Tempo</span>
              <select
                className="text-input"
                value={formState.tempo}
                onChange={(event) => updateField("tempo", event.target.value as Tempo)}
              >
                {tempoOptions.map((tempo) => (
                  <option key={tempo} value={tempo}>
                    {tempo}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span>Duration</span>
              <input
                className="text-input"
                type="number"
                min="0.5"
                max="20"
                step="0.5"
                value={formState.duration}
                onChange={(event) => updateField("duration", event.target.value)}
                required
              />
            </label>
          </div>

          <label className="field-group">
            <span>Singer</span>
            <input
              className="text-input"
              value={formState.singer}
              onChange={(event) => updateField("singer", event.target.value)}
              placeholder="Lead singer"
              required
            />
          </label>

          <label className="field-group">
            <span>Tags</span>
            <input
              className="text-input"
              value={formState.tags}
              onChange={(event) => updateField("tags", event.target.value)}
              placeholder="opener, closer, gospel"
            />
          </label>

          <label className="field-group">
            <span>Notes</span>
            <textarea
              className="text-input textarea-input"
              value={formState.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Capo, intro, transitions, solos"
              rows={4}
            />
          </label>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingSongId ? "Update song" : "Add song"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={refreshSongs}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh list"}
            </button>
          </div>
        </form>

        {message ? <p className="form-message success-message">{message}</p> : null}
        {error ? <p className="form-message error-message">{error}</p> : null}
      </article>

      <div className="table-card">
        <div className="library-table-header">
          <div className="stack-xs">
            <p className="eyebrow">Song Library</p>
            <h2>{songs.length} songs</h2>
          </div>
        </div>

        <div className="table-scroll">
          <table className="song-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Key</th>
                <th>Tempo</th>
                <th>Duration</th>
                <th>Singer</th>
                <th>Tags</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {songs.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <p>No songs yet. Add your first tune to start building the library.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                songs.map((song) => (
                  <tr key={song.id}>
                    <td>
                      <strong>{song.title}</strong>
                    </td>
                    <td>{song.key}</td>
                    <td className="capitalize-cell">{song.tempo}</td>
                    <td>{song.duration} min</td>
                    <td>{song.singer}</td>
                    <td>{song.tags.length > 0 ? song.tags.join(", ") : "-"}</td>
                    <td className="notes-cell">{song.notes || "-"}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => {
                            setEditingSongId(song.id);
                            setMessage(null);
                            setError(null);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="danger-button"
                          type="button"
                          onClick={() => handleDelete(song.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
