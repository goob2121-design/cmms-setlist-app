import { NextResponse } from "next/server";
import { createSong, listSongs } from "@/lib/songs";
import { createSongSchema } from "@/lib/validation";

export async function GET() {
  try {
    const songs = await listSongs();
    return NextResponse.json(songs);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load songs." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = createSongSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid song payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const song = await createSong(parsed.data);
    return NextResponse.json(song, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create song." },
      { status: 500 }
    );
  }
}
