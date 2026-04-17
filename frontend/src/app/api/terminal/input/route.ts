import { type NextRequest, NextResponse } from "next/server";

import { writeTerminalInput } from "@/lib/terminal-session";
import { resolveAuthenticatedUser } from "@/server/terminal-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TerminalInputBody {
  sessionId: string;
  data: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request
      .json()
      .catch(() => null)) as TerminalInputBody | null;
    if (
      !body ||
      typeof body.sessionId !== "string" ||
      body.sessionId.trim().length === 0 ||
      typeof body.data !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid input payload." },
        { status: 400 },
      );
    }

    if (body.data.length === 0) {
      return NextResponse.json(
        { error: "Input cannot be empty." },
        { status: 400 },
      );
    }

    const result = writeTerminalInput(body.sessionId, user.id, body.data);
    if (result === "missing") {
      return NextResponse.json(
        { error: "Terminal session is unavailable." },
        { status: 404 },
      );
    }
    if (result === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Terminal input failed.", error);
    return NextResponse.json(
      { error: "Failed to send terminal input." },
      { status: 500 },
    );
  }
}
