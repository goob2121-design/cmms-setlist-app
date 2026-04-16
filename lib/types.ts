export type Tempo = "slow" | "medium" | "fast";

export type Song = {
  id: string;
  title: string;
  key: string;
  tempo: Tempo;
  duration: number;
  singer: string;
  notes: string;
  tags: string[];
};

export type SongFormValues = Omit<Song, "id">;

export type SongSummary = Song;

export type SetlistStatus = "draft" | "live" | "archived";

export type SetlistItem = {
  id: string;
  songId: string;
  position: number;
  isOptional: boolean;
  arrangementNotes: string;
  song: Song;
};

export type SetlistSummary = {
  id: string;
  name: string;
  status: SetlistStatus;
  songCount: number;
  totalDurationMinutes: number;
  description: string;
};

export type SetlistDetail = SetlistSummary & {
  items: SetlistItem[];
};

export type SetlistFormValues = {
  name: string;
  description: string;
  status?: SetlistStatus;
  items: Array<{
    songId: string;
    position: number;
    isOptional?: boolean;
    arrangementNotes?: string;
  }>;
};

export type GeneratedSetlistOption = {
  id: string;
  label: string;
  totalDurationMinutes: number;
  targetDurationMinutes: number;
  songs: Song[];
};

export type LiveSetState = {
  id: string;
  currentIndex: number;
  items: Song[];
};

export type LiveSession = {
  id: string;
  setlistId: string;
  currentItemId: string | null;
  currentPosition: number;
  isActive: boolean;
  startedAt: string;
  updatedAt: string;
};

export type PerformedSetHistory = {
  id: string;
  setlistId: string;
  setlistName: string;
  performedAt: string;
  actualDurationMinutes: number;
};

export type DashboardAnalytics = {
  totalPerformedSets: number;
  averageSetDurationMinutes: number;
  mostPlayedSongs: Array<{
    songId: string;
    title: string;
    count: number;
  }>;
  mostCommonOpeners: Array<{
    songId: string;
    title: string;
    count: number;
  }>;
  mostCommonClosers: Array<{
    songId: string;
    title: string;
    count: number;
  }>;
  recentPerformedSets: PerformedSetHistory[];
};
