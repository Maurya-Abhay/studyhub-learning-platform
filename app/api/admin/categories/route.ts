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

async function findDuplicate(supabase: Awaited<ReturnType<typeof createClient>>, name: string, excludeId?: string) {
  const { data } = await supabase.from('study_categories').select('id,name');
  const normalized = name.trim().toLowerCase();
  return (data ?? []).find((row) => row.id !== excludeId && row.name.trim().toLowerCase() === normalized);
}

export async function GET() {
  const { response, supabase } = await admin();
  if (response) return response;
  const { data, error } = await supabase.from('study_categories').select('*').order('sort_order').order('name');
  if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 500 });
  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(req: Request) {
  const { response, supabase } = await admin();
  if (response) return response;
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }

  if (b.action === 'bulk') {
    const records = Array.isArray(b.records) ? b.records : [];
    if (!records.length) return NextResponse.json({ error: 'records must be a non-empty array.' }, { status: 400 });
    if (records.length > 500) return NextResponse.json({ error: 'Bulk imports are limited to 500 records per request.' }, { status: 413 });
    const built = records.map((r: any) => {
      const name = String(r.name ?? r.title ?? '').trim();
      return { name, slug: String(r.slug ?? slugify(name)), description: String(r.description ?? ''), icon: String(r.icon ?? '•'), published: r.published !== false, sort_order: Number(r.sortOrder ?? r.sort_order) || 0 };
    });
    if (built.some((x: { name: string }) => !x.name)) return NextResponse.json({ error: 'Every category needs a name.' }, { status: 400 });

    // Reject duplicate names within the batch itself (case-insensitive).
    const seen = new Set<string>();
    for (const item of built) {
      const key = item.name.toLowerCase();
      if (seen.has(key)) return NextResponse.json({ error: `Duplicate category "${item.name}" in the pasted list.` }, { status: 400 });
      seen.add(key);
    }
    // Reject names that already exist in the database (case-insensitive), so
    // "css" and "CSS" can never both exist and split topics across two rows.
    const { data: existingRows } = await supabase.from('study_categories').select('name');
    const existingNames = new Set((existingRows ?? []).map((row) => row.name.trim().toLowerCase()));
    const conflict = built.find((item: { name: string }) => existingNames.has(item.name.toLowerCase()));
    if (conflict) return NextResponse.json({ error: `A category named "${conflict.name}" already exists. Edit the existing category instead of creating a duplicate.` }, { status: 400 });

    const { data, error } = await supabase.from('study_categories').insert(built).select();
    if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
    return NextResponse.json({ imported: data?.length ?? 0, categories: data ?? [] }, { status: 201 });
  }

  const name = String(b.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
  const duplicate = await findDuplicate(supabase, name);
  if (duplicate) return NextResponse.json({ error: `A category named "${duplicate.name}" already exists. Edit it instead of creating a duplicate.` }, { status: 400 });

  const { data, error } = await supabase.from('study_categories').insert({ name, slug: String(b.slug ?? slugify(name)), description: String(b.description ?? ''), icon: String(b.icon ?? '•'), published: b.published !== false, sort_order: Number(b.sortOrder ?? 0) || 0 }).select().single();
  if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
  return NextResponse.json({ category: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const { response, supabase } = await admin();
  if (response) return response;
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const name = String(b.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const duplicate = await findDuplicate(supabase, name, b.id);
  if (duplicate) return NextResponse.json({ error: `A category named "${duplicate.name}" already exists. Rename this one or merge with the existing category instead.` }, { status: 400 });

  const { data: existing } = await supabase.from('study_categories').select('slug').eq('id', b.id).maybeSingle();
  const { data, error } = await supabase.from('study_categories').update({ name, slug: String(b.slug ?? existing?.slug ?? slugify(name)), description: String(b.description ?? ''), icon: String(b.icon ?? '•'), published: b.published === true, sort_order: Number(b.sortOrder ?? 0) || 0 }).eq('id', b.id).select().single();
  if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
  return NextResponse.json({ category: data });
}

export async function DELETE(req: Request) {
  const { response, supabase } = await admin();
  if (response) return response;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await supabase.from('study_categories').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
