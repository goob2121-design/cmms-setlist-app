import { NextResponse } from "next/server";
import { generateSetlistOptions } from "@/lib/setlist-generator";
import { listSongs } from "@/lib/songs";
import { generateSetlistSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = generateSetlistSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid generator request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const songs = await listSongs();
    const options = generateSetlistOptions(songs, parsed.data);

    return NextResponse.json({
      targetDurationMinutes: parsed.data.totalTimeMinutes,
      options
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate setlists." },
      { status: 500 }
    );
  }
}
