import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 10_000;

export type RateLimitOptions = { limit: number; windowMs: number; key?: string };

export function rateLimit(request: Request, options: RateLimitOptions) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded || realIp || 'unknown';
  const key = `${options.key ?? 'api'}:${ip}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey);
      if (buckets.size >= MAX_BUCKETS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: options.limit - 1, retryAfter: Math.ceil(options.windowMs / 1000) };
  }
  current.count += 1;
  const allowed = current.count <= options.limit;
  return { allowed, remaining: Math.max(0, options.limit - current.count), retryAfter: Math.ceil((current.resetAt - now) / 1000) };
}

export function rateLimitedResponse(retryAfter: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, retryAfter)), 'Cache-Control': 'no-store' } },
  );
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
}

export function serverError(message = 'Something went wrong. Please try again.') {
  return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
}

export function externalError() {
  return NextResponse.json({ error: 'The requested service is temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
}

export async function readJson<T = Record<string, unknown>>(request: Request, maxBytes = 256_000): Promise<T> {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) throw new Error('REQUEST_TOO_LARGE');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error('REQUEST_TOO_LARGE');
  try { return JSON.parse(text) as T; } catch { throw new Error('INVALID_JSON'); }
}

export async function getApiUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export async function getApiAdmin() {
  const { supabase, user } = await getApiUser();
  if (!user) return { supabase, user: null, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (error || profile?.role !== 'admin') {
    return { supabase, user, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) };
  }
  return { supabase, user, response: null };
}

export function noStore(response: Response) {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}
