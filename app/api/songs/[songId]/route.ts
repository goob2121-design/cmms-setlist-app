import { NextResponse } from "next/server";
import { deleteSong, getSong, updateSong } from "@/lib/songs";
import { updateSongSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    songId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { songId } = await context.params;

  try {
    const song = await getSong(songId);
    return NextResponse.json(song);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch song." },
      { status: 404 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { songId } = await context.params;
  const payload = await request.json();
  const parsed = updateSongSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid song update", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const song = await updateSong(songId, parsed.data);
    return NextResponse.json(song);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update song." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { songId } = await context.params;

  try {
    await deleteSong(songId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete song." },
      { status: 500 }
    );
  }
}
