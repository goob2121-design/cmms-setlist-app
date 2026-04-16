import type { GeneratedSetlistOption, Song, Tempo } from "@/lib/types";

type GeneratorCriteria = {
  totalTimeMinutes: number;
  variationCount?: number;
};

type TempoCounts = Record<Tempo, number>;

const tempoTargets: Tempo[] = ["fast", "medium", "slow"];

function clampVariationCount(value: number | undefined) {
  if (!value) {
    return 3;
  }

  return Math.max(1, Math.min(5, value));
}

function createTempoCounts(): TempoCounts {
  return {
    slow: 0,
    medium: 0,
    fast: 0
  };
}

function preferredTempoForSlot(index: number, length: number): Tempo {
  if (length <= 1) {
    return "medium";
  }

  if (index === 0) {
    return "fast";
  }

  if (index === length - 1) {
    return "medium";
  }

  return tempoTargets[index % tempoTargets.length];
}

function targetSongCount(songs: Song[], totalTimeMinutes: number) {
  if (songs.length === 0) {
    return 0;
  }

  const averageDuration =
    songs.reduce((total, song) => total + song.duration, 0) / songs.length;

  return Math.max(1, Math.round(totalTimeMinutes / Math.max(averageDuration, 1)));
}

function scoreSong(
  candidate: Song,
  current: Song[],
  tempoCounts: TempoCounts,
  singerCounts: Map<string, number>,
  slotIndex: number,
  idealCount: number,
  targetDurationMinutes: number
) {
  const currentDuration = current.reduce((total, song) => total + song.duration, 0);
  const nextDuration = currentDuration + candidate.duration;
  const previousSong = current[current.length - 1];
  const targetTempo = preferredTempoForSlot(slotIndex, Math.max(idealCount, slotIndex + 1));
  const singerCount = singerCounts.get(candidate.singer) ?? 0;
  const maxSingerCount = Math.max(0, ...singerCounts.values(), 0);
  const currentTempoCount = tempoCounts[candidate.tempo];
  const minTempoCount = Math.min(...Object.values(tempoCounts));
  let score = 0;

  if (!previousSong) {
    if (candidate.tempo === "fast") {
      score += 10;
    }
  }

  if (candidate.tempo === targetTempo) {
    score += 8;
  }

  if (currentTempoCount === minTempoCount) {
    score += 4;
  }

  if (previousSong?.key.trim().toLowerCase() === candidate.key.trim().toLowerCase()) {
    score -= 12;
  } else {
    score += 6;
  }

  if (previousSong?.singer === candidate.singer) {
    score -= 7;
  }

  if (singerCount < maxSingerCount) {
    score += 5;
  } else if (maxSingerCount === 0) {
    score += 3;
  }

  const durationGapAfterPick = Math.abs(targetDurationMinutes - nextDuration);
  score += Math.max(0, 12 - durationGapAfterPick * 1.5);

  if (nextDuration > targetDurationMinutes + 2) {
    score -= 8;
  }

  score += candidate.tags.length > 0 ? 1 : 0;

  return score;
}

function buildVariation(
  songs: Song[],
  totalTimeMinutes: number,
  variationIndex: number
) {
  const pool = songs.slice();
  const selected: Song[] = [];
  const tempoCounts = createTempoCounts();
  const singerCounts = new Map<string, number>();
  const idealCount = targetSongCount(pool, totalTimeMinutes);

  while (pool.length > 0) {
    const scored = pool
      .map((song, index) => ({
        index,
        song,
        score:
          scoreSong(
            song,
            selected,
            tempoCounts,
            singerCounts,
            selected.length,
            idealCount,
            totalTimeMinutes
          ) +
          ((index + variationIndex * 3) % 7) * 0.15
      }))
      .sort((left, right) => right.score - left.score);

    const currentDuration = selected.reduce((total, song) => total + song.duration, 0);
    const remaining = totalTimeMinutes - currentDuration;
    const candidates =
      remaining <= 2
        ? scored.filter((entry) => entry.song.duration <= remaining + 1)
        : scored.slice(0, Math.min(4, scored.length));
    const picked = candidates[variationIndex % Math.max(1, candidates.length)] ?? scored[0];

    if (!picked) {
      break;
    }

    if (
      currentDuration >= totalTimeMinutes - 1 &&
      Math.abs(totalTimeMinutes - currentDuration) <=
        Math.abs(totalTimeMinutes - (currentDuration + picked.song.duration))
    ) {
      break;
    }

    selected.push(picked.song);
    tempoCounts[picked.song.tempo] += 1;
    singerCounts.set(picked.song.singer, (singerCounts.get(picked.song.singer) ?? 0) + 1);
    pool.splice(picked.index, 1);

    const newDuration = currentDuration + picked.song.duration;

    if (newDuration >= totalTimeMinutes - 1 && selected.length >= Math.max(3, idealCount - 1)) {
      break;
    }
  }

  return selected;
}

export function generateSetlistOptions(
  songs: Song[],
  criteria: GeneratorCriteria
): GeneratedSetlistOption[] {
  const variationCount = clampVariationCount(criteria.variationCount);
  const activeSongs = songs.filter((song) => song.duration > 0);

  if (activeSongs.length === 0) {
    return [];
  }

  const variations = Array.from({ length: variationCount }, (_, index) => {
    const builtSongs = buildVariation(activeSongs, criteria.totalTimeMinutes, index);
    const totalDurationMinutes = builtSongs.reduce((total, song) => total + song.duration, 0);

    return {
      id: `variation-${index + 1}`,
      label: `Option ${index + 1}`,
      totalDurationMinutes,
      targetDurationMinutes: criteria.totalTimeMinutes,
      songs: builtSongs
    };
  });

  return variations.filter((option) => option.songs.length > 0);
}
