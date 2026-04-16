import { NextResponse } from "next/server";
import { getActiveLiveSession, getOrCreateActiveLiveSession, updateActiveLiveSession } from "@/lib/live-sessions";
import { updateLiveSessionSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setlistId = searchParams.get("setlistId");

  if (!setlistId) {
    return NextResponse.json({ error: "setlistId is required." }, { status: 400 });
  }

  try {
    const session = await getActiveLiveSession(setlistId);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load live session." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = updateLiveSessionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid live session payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const session = await getOrCreateActiveLiveSession(
      parsed.data.setlistId,
      parsed.data.currentItemId ?? null,
      parsed.data.currentPosition ?? 0
    );

    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create live session." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const payload = await request.json();
  const parsed = updateLiveSessionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid live session payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const session = await updateActiveLiveSession(parsed.data.setlistId, {
      currentItemId: parsed.data.currentItemId,
      currentPosition: parsed.data.currentPosition
    });

    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update live session." },
      { status: 500 }
    );
  }
}
