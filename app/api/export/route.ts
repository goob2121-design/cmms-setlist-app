import { NextResponse } from "next/server";
import { getSetlist } from "@/lib/setlists";
import {
  createFacebookPostText,
  createPlaylistText,
  createPrintableText
} from "@/lib/setlist-export";

export async function POST(request: Request) {
  const payload = await request.json();
  const setlistId = payload?.setlistId;

  if (!setlistId || typeof setlistId !== "string") {
    return NextResponse.json({ error: "setlistId is required." }, { status: 400 });
  }

  try {
    const setlist = await getSetlist(setlistId);

    return NextResponse.json({
      setlistId: setlist.id,
      setlistName: setlist.name,
      facebookText: createFacebookPostText(setlist),
      playlistText: createPlaylistText(setlist),
      printableText: createPrintableText(setlist),
      printableUrl: `/setlists/${setlist.id}/print`,
      pdfUrl: `/setlists/${setlist.id}/print?autoprint=1`
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to export setlist." },
      { status: 500 }
    );
  }
}
