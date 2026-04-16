import { NextResponse } from "next/server";
import { deleteSetlist, getSetlist, updateSetlist } from "@/lib/setlists";
import { updateSetlistSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    setlistId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { setlistId } = await context.params;

  try {
    const setlist = await getSetlist(setlistId);
    return NextResponse.json(setlist);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch setlist." },
      { status: 404 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { setlistId } = await context.params;
  const payload = await request.json();
  const parsed = updateSetlistSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid setlist update", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const setlist = await updateSetlist(setlistId, parsed.data);
    return NextResponse.json(setlist);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update setlist." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { setlistId } = await context.params;

  try {
    await deleteSetlist(setlistId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete setlist." },
      { status: 500 }
    );
  }
}
