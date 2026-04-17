import { type NextRequest, NextResponse } from "next/server";
import { destroyTerminalSessionsByOwner } from "@/lib/terminal-session";
import {
  clearTerminalSshTarget,
  createTerminalSshTargetCookieValue,
  getTerminalSshTargetPublic,
  restoreTerminalSshTargetFromCookie,
  setTerminalSshTarget,
  TERMINAL_SSH_TARGET_COOKIE_MAX_AGE_SECONDS,
  TERMINAL_SSH_TARGET_COOKIE_NAME,
} from "@/lib/terminal-ssh-target";
import { resolveAuthenticatedUser } from "@/server/terminal-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TerminalTargetBody {
  username: string;
  host: string;
  port?: number | null;
  password?: string | null;
}

export async function GET(request: NextRequest): Promise<Response> {
  const user = await resolveAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fromMemory = getTerminalSshTargetPublic(user.id);
  if (fromMemory) {
    return NextResponse.json({ target: fromMemory });
  }

  const restored = restoreTerminalSshTargetFromCookie(
    user.id,
    request.cookies.get(TERMINAL_SSH_TARGET_COOKIE_NAME)?.value,
  );
  const target = restored
    ? {
        username: restored.username,
        host: restored.host,
        port: restored.port,
      }
    : null;

  return NextResponse.json({ target });
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request
      .json()
      .catch(() => null)) as TerminalTargetBody | null;
    if (
      !body ||
      typeof body.username !== "string" ||
      typeof body.host !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid SSH target payload." },
        { status: 400 },
      );
    }

    const target = setTerminalSshTarget(user.id, {
      username: body.username,
      hostOrUrl: body.host,
      port: body.port,
      password: body.password,
    });

    destroyTerminalSessionsByOwner(user.id);

    const response = NextResponse.json({
      target: {
        username: target.username,
        host: target.host,
        port: target.port,
      },
      ok: true,
    });

    response.cookies.set({
      name: TERMINAL_SSH_TARGET_COOKIE_NAME,
      value: createTerminalSshTargetCookieValue(user.id, target),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TERMINAL_SSH_TARGET_COOKIE_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to configure SSH terminal target.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const user = await resolveAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  clearTerminalSshTarget(user.id);
  destroyTerminalSessionsByOwner(user.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: TERMINAL_SSH_TARGET_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
