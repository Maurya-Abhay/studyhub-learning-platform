import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function slugify(v: string) { return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 120); }
async function admin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }), supabase };
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (p?.role !== 'admin') return { response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }), supabase };
  return { supabase, user };
}
export async function GET() {
  const { response, supabase } = await admin();
  if (response) return response;
  const { data, error } = await supabase.from('dsa_topics').select('id,name,slug,description,published,sort_order').order('sort_order').order('name');
  if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 500 });
  return NextResponse.json({ topics: data ?? [] });
}
export async function POST(req: Request) {
  const { response, supabase } = await admin();
  if (response) return response;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  const source = body as Record<string, unknown>;
  if (source.action === 'bulk') {
    const records = Array.isArray(source.records) ? source.records : [];
    if (!records.length) return NextResponse.json({ error: 'records must be a non-empty array.' }, { status: 400 });
    if (records.length > 500) return NextResponse.json({ error: 'Bulk imports are limited to 500 records per request.' }, { status: 413 });
    const built = records.map((raw) => {
      const r = raw as Record<string, unknown>;
      const name = String(r.name ?? r.title ?? '').trim();
      return { name, slug: String(r.slug ?? slugify(name)).trim(), description: String(r.description ?? ''), published: r.published !== false, sort_order: Number(r.sortOrder ?? r.sort_order) || 0 };
    });
    if (built.some((r) => !r.name || !r.slug)) return NextResponse.json({ error: 'Every DSA topic needs a name/title.' }, { status: 400 });
    const { data, error } = await supabase.from('dsa_topics').insert(built).select();
    if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
    return NextResponse.json({ imported: data?.length ?? 0, topics: data ?? [] }, { status: 201 });
  }
  const name = String(source.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Topic name is required.' }, { status: 400 });
  const { data, error } = await supabase.from('dsa_topics').insert({ name, slug: String(source.slug ?? slugify(name)), description: String(source.description ?? ''), published: source.published !== false, sort_order: Number(source.sortOrder ?? 0) || 0 }).select().single();
  if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
  return NextResponse.json({ topic: data }, { status: 201 });
}
export async function PATCH(req: Request) {
  const { response, supabase } = await admin();
  if (response) return response;
  const b = await req.json() as Record<string, unknown>;
  const id = String(b.id ?? '');
  const name = String(b.name ?? '').trim();
  if (!id || !name) return NextResponse.json({ error: 'id and name are required.' }, { status: 400 });
  const { data, error } = await supabase.from('dsa_topics').update({ name, slug: String(b.slug ?? slugify(name)), description: String(b.description ?? ''), published: b.published !== false, sort_order: Number(b.sortOrder ?? 0) || 0 }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
  return NextResponse.json({ topic: data });
}
export async function DELETE(req: Request) {
  const { response, supabase } = await admin();
  if (response) return response;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
  const { error } = await supabase.from('dsa_topics').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
