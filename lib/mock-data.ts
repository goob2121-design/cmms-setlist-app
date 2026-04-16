import type { LiveSetState, SetlistSummary, SongSummary } from "@/lib/types";

export const mockDashboardStats = [
  { label: "Songs in library", value: "82", helper: "With keys, tempo, notes, and tags" },
  { label: "Average set length", value: "47 min", helper: "Based on saved show history" },
  { label: "Most common opener", value: "Roll in My Sweet Baby's Arms", helper: "Played 14 times" }
];

export const mockSongs: SongSummary[] = [
  {
    id: "song-1",
    title: "Roll in My Sweet Baby's Arms",
    key: "G",
    tempo: "fast",
    duration: 3,
    singer: "Bryan",
    notes: "Kick off with mandolin chop intro.",
    tags: ["opener", "standard"]
  },
  {
    id: "song-2",
    title: "Long Journey Home",
    key: "A",
    tempo: "medium",
    duration: 4,
    singer: "Sarah",
    notes: "Capo 2 for guitar. Four-count vocal entry.",
    tags: ["gospel", "harmony"]
  },
  {
    id: "song-3",
    title: "Jerusalem Ridge",
    key: "A minor",
    tempo: "fast",
    duration: 5,
    singer: "Instrumental",
    notes: "Watch the tag ending and banjo break order.",
    tags: ["instrumental", "feature"]
  }
];

export const mockSetlists: SetlistSummary[] = [
  {
    id: "set-1",
    name: "Friday Early Show",
    status: "draft",
    songCount: 12,
    totalDurationMinutes: 46,
    description: "Balanced mix of fast openers, one gospel block, and an instrumental closer."
  },
  {
    id: "set-2",
    name: "Festival Main Set",
    status: "live",
    songCount: 14,
    totalDurationMinutes: 58,
    description: "Designed for outdoor stage pacing with stronger singer rotation."
  }
];

export const mockLiveSet: LiveSetState = {
  id: "live-1",
  currentIndex: 1,
  items: mockSongs
};
