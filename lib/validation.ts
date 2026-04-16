import { z } from "zod";

export const tempoSchema = z.enum(["slow", "medium", "fast"]);

export const createSongSchema = z.object({
  title: z.string().min(1).max(200),
  key: z.string().min(1).max(20),
  tempo: tempoSchema,
  duration: z.number().positive().max(20),
  singer: z.string().min(1).max(120),
  notes: z.string().max(2000).default(""),
  tags: z.array(z.string().min(1).max(50)).default([])
});

export const updateSongSchema = createSongSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  "At least one song field must be provided."
);

export const createSetlistSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  status: z.enum(["draft", "live", "archived"]).default("draft"),
  items: z
    .array(
      z.object({
        songId: z.string().uuid().or(z.string().min(1)),
        position: z.number().int().nonnegative(),
        isOptional: z.boolean().default(false),
        arrangementNotes: z.string().max(2000).default("")
      })
    )
    .default([])
});

export const updateSetlistSchema = createSetlistSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  "At least one setlist field must be provided."
);

export const updateLiveSessionSchema = z.object({
  setlistId: z.string().uuid().or(z.string().min(1)),
  currentItemId: z.string().uuid().or(z.string().min(1)).nullable().optional(),
  currentPosition: z.number().int().nonnegative().optional(),
  action: z.enum(["advance", "reorder", "add_time", "cut_time", "note_update", "activate"]),
  payload: z.record(z.string(), z.unknown()).default({})
});

export const generateSetlistSchema = z.object({
  totalTimeMinutes: z.number().int().positive().max(240),
  includeTags: z.array(z.string()).default([]),
  excludeTags: z.array(z.string()).default([]),
  desiredTempoMix: z
    .object({
      slow: z.number().int().nonnegative().default(0),
      medium: z.number().int().nonnegative().default(0),
      fast: z.number().int().nonnegative().default(0)
    })
    .default({ slow: 0, medium: 0, fast: 0 }),
  rotateSingers: z.boolean().default(true),
  variationCount: z.number().int().min(1).max(5).default(3)
});
