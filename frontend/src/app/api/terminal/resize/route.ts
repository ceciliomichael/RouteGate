import { type NextRequest, NextResponse } from "next/server";

import { resizeTerminalSession } from "@/lib/terminal-session";
import { resolveAuthenticatedUser } from "@/server/terminal-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TerminalResizeBody {
  sessionId: string;
  cols: number;
  rows: number;
}

function parseDimension(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const roundedValue = Math.trunc(value);
  if (roundedValue < 10 || roundedValue > 500) {
    return null;
  }

  return roundedValue;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request
      .json()
      .catch(() => null)) as TerminalResizeBody | null;
    if (
      !body ||
      typeof body.sessionId !== "string" ||
      body.sessionId.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid resize payload." },
        { status: 400 },
      );
    }

    const cols = parseDimension(body.cols);
    const rows = parseDimension(body.rows);
    if (cols === null || rows === null) {
      return NextResponse.json(
        { error: "Invalid terminal dimensions." },
        { status: 400 },
      );
    }

    const result = resizeTerminalSession(body.sessionId, user.id, {
      cols,
      rows,
    });
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
    console.error("Terminal resize failed.", error);
    return NextResponse.json(
      { error: "Failed to resize terminal." },
      { status: 500 },
    );
  }
}
