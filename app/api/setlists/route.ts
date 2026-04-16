import { NextResponse } from "next/server";
import { createSetlist, listSetlists } from "@/lib/setlists";
import { createSetlistSchema } from "@/lib/validation";

export async function GET() {
  try {
    const setlists = await listSetlists();
    return NextResponse.json(setlists);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load setlists." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = createSetlistSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid setlist payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const setlist = await createSetlist(parsed.data);
    return NextResponse.json(setlist, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create setlist." },
      { status: 500 }
    );
  }
}
