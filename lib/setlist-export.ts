import type { SetlistDetail } from "@/lib/types";

function formatSongLine(setlist: SetlistDetail, includeNumbers: boolean) {
  return setlist.items
    .map((item, index) => {
      const prefix = includeNumbers ? `${index + 1}. ` : "";
      return `${prefix}${item.song.title} (${item.song.key})`;
    })
    .join("\n");
}

export function createFacebookPostText(setlist: SetlistDetail) {
  const songs = setlist.items.map((item) => item.song.title).join(", ");

  return [
    `Tonight's set from ${setlist.name}:`,
    songs,
    "",
    "Come hear it live and sing along with us."
  ].join("\n");
}

export function createPlaylistText(setlist: SetlistDetail) {
  return formatSongLine(setlist, true);
}

export function createPrintableText(setlist: SetlistDetail) {
  return [
    setlist.name,
    setlist.description || "",
    "",
    ...setlist.items.map(
      (item, index) =>
        `${index + 1}. ${item.song.title} | ${item.song.key} | ${item.song.tempo} | ${item.song.duration} min | ${item.song.singer}`
    )
  ]
    .filter(Boolean)
    .join("\n");
}
