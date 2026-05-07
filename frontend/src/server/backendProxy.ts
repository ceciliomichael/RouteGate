import { NextResponse } from "next/server";
import {
  buildBackendApiUrlFromBase,
  getBackendApiBaseCandidates,
} from "./backendApiBase";

const FORWARDED_HEADERS = [
  "accept",
  "authorization",
  "content-type",
  "cookie",
] as const;

const RESPONSE_HEADERS = [
  "allow",
  "cache-control",
  "content-type",
  "etag",
  "last-modified",
  "set-cookie",
  "x-accel-buffering",
] as const;

function copyRequestHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const headerName of FORWARDED_HEADERS) {
    const value = request.headers.get(headerName);
    if (value) {
      headers.set(headerName, value);
    }
  }
  return headers;
}

function toClientResponse(upstreamResponse: Response): Response {
  const headers = new Headers();

  for (const headerName of RESPONSE_HEADERS) {
    const value = upstreamResponse.headers.get(headerName);
    if (value) {
      headers.set(headerName, value);
    }
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
}

export async function forwardToBackendApi(
  request: Request,
  paramsPromise: Promise<{ path?: string[] }>,
  baseSegments: string[],
): Promise<Response> {
  try {
    const params = await paramsPromise;
    const currentUrl = new URL(request.url);
    const method = request.method.toUpperCase();
    const headers = copyRequestHeaders(request);
    const body =
      method !== "GET" && method !== "HEAD" ? await request.text() : undefined;
    const pathSegments = [...baseSegments, ...(params.path ?? [])];
    const upstreamUrls = getBackendApiBaseCandidates().map((baseUrl) =>
      buildBackendApiUrlFromBase(baseUrl, pathSegments, currentUrl.search),
    );
    const init: RequestInit = {
      method,
      headers,
      cache: "no-store",
      body,
    };

    let lastError: unknown = null;
    for (const upstreamUrl of upstreamUrls) {
      try {
        const upstreamResponse = await fetch(upstreamUrl, init);
        return toClientResponse(upstreamResponse);
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) {
      throw lastError;
    }
    throw new Error("Backend unavailable");
  } catch (error) {
    const message =
      error instanceof Error && error.message === "Invalid backend API base URL"
        ? "Server configuration error"
        : "Backend unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
