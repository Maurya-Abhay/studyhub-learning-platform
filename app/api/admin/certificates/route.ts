import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function admin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { supabase, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) };
  return { supabase, response: null, user };
}

export async function GET() {
  const { supabase, response } = await admin();
  if (response) return response;
  const { data, error } = await supabase.from('certificates').select('certificate_code,score,issued_at,revoked_at,user_id,course_id').order('issued_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 500 });
  const rows = data ?? [];
  const userIds = [...new Set(rows.map((item) => item.user_id))];
  const courseIds = [...new Set(rows.map((item) => item.course_id))];
  const [{ data: profiles }, { data: courses }] = await Promise.all([
    userIds.length ? supabase.from('profiles').select('id,name').in('id', userIds) : Promise.resolve({ data: [] as Array<{ id: string; name: string | null }> }),
    courseIds.length ? supabase.from('courses').select('id,title').in('id', courseIds) : Promise.resolve({ data: [] as Array<{ id: string; title: string | null }> }),
  ]);
  const profileMap = new Map((profiles ?? []).map((item) => [item.id, { name: item.name }]));
  const courseMap = new Map((courses ?? []).map((item) => [item.id, { title: item.title }]));
  return NextResponse.json({ certificates: rows.map(({ user_id, course_id, ...item }) => ({ ...item, profiles: profileMap.get(user_id) ?? null, courses: courseMap.get(course_id) ?? null })) });
}

export async function PATCH(request: Request) {
  const { supabase, response, user } = await admin();
  if (response) return response;
  let body: { certificateCode?: unknown; revoked?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const code = typeof body.certificateCode === 'string' ? body.certificateCode.trim() : '';
  if (!code) return NextResponse.json({ error: 'certificateCode is required.' }, { status: 400 });
  const revoked = body.revoked === true;
  const { data, error } = await supabase.from('certificates').update({ revoked_at: revoked ? new Date().toISOString() : null }).eq('certificate_code', code).select('certificate_code,revoked_at').single();
  if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
  await supabase.from('activity_logs').insert({ user_id: user.id, event_type: revoked ? 'ADMIN_CERTIFICATE_REVOKED' : 'ADMIN_CERTIFICATE_RESTORED', entity_type: 'certificate', metadata: { certificateCode: code } });
  return NextResponse.json({ certificate: data });
}
