import { NextResponse } from 'next/server';
import { getApiAdmin, rateLimit, rateLimitedResponse, readJson } from '@/lib/api-security';

export async function POST(request: Request) {
  const { supabase, user, response } = await getApiAdmin();
  if (response) return response;
  const limit = rateLimit(request, { key: `ai-save:${user!.id}`, limit: 20, windowMs: 60_000 });
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfter);
  let body: { kind?: unknown; title?: unknown; instruction?: unknown; output?: unknown };
  try { body = await readJson(request, 300_000); } catch { return NextResponse.json({ error: 'Invalid or oversized request.' }, { status: 400 }); }
  if (typeof body.kind !== 'string' || body.kind.length > 40 || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200 || body.output === undefined) return NextResponse.json({ error: 'Valid kind, title and output are required.' }, { status: 400 });
  const instruction = typeof body.instruction === 'string' ? body.instruction.slice(0, 4_000) : '';
  const output = typeof body.output === 'string' ? { content: body.output.slice(0, 200_000) } : body.output;
  const { data, error } = await supabase.from('ai_generations').insert({ admin_user_id: user!.id, kind: body.kind, title: body.title.trim(), instruction, output, status: 'draft' }).select('id').single();
  if (error) return NextResponse.json({ error: 'Unable to save AI draft.' }, { status: 400 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
