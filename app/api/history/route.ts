import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardAnalytics, savePerformedSet } from "@/lib/analytics";

const savePerformedSetSchema = z.object({
  setlistId: z.string().uuid().or(z.string().min(1)),
  actualDurationMinutes: z.number().positive().max(300),
  audienceNotes: z.string().max(4000).optional()
});

export async function GET() {
  try {
    const analytics = await getDashboardAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load history." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = savePerformedSetSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid performed set payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const history = await savePerformedSet(parsed.data);
    return NextResponse.json(history, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save performed set." },
      { status: 500 }
    );
  }
}
