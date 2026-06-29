import { NextResponse } from "next/server";

// A small in-memory, fixed-window rate limiter. It keeps a per-key request
// count that resets every window.
//
// Limitation worth knowing: the counters live in this process's memory, so the
// limit is per server instance. On a multi-instance or serverless deployment
// each instance counts separately, and you would move this to a shared store
// (for example Redis / Upstash). For a single-instance app it is enough.

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Drop expired buckets occasionally so the map cannot grow without bound as new
// client keys appear (otherwise the limiter itself becomes a memory leak).
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;

  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

function hit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count++;
  return { ok: true, retryAfter: 0 };
}

// Best-effort client identifier. Behind a proxy or on Vercel the real client IP
// arrives in x-forwarded-for; locally these headers are absent and every
// request shares the "local" bucket, which is fine for development.
function clientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "local";
}

// Enforces a rate limit for a named endpoint. Returns a 429 response to return
// directly, or null when the request is allowed to proceed.
export function enforceRateLimit(
  request: Request,
  name: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const { ok, retryAfter } = hit(
    `${name}:${clientId(request)}`,
    limit,
    windowMs
  );

  if (ok) {
    return null;
  }

  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    }
  );
}
