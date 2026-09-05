import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function admin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { supabase, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) };
  return { supabase, user };
}

export async function GET() {
  const { supabase, response } = await admin();
  if (response) return response;
  const [{ data, error }, { data: progress }, { data: enrollments }, { data: attempts }, { data: submissions }, { data: certificates }] = await Promise.all([
    supabase.from('profiles').select('id,name,role,created_at').order('created_at', { ascending: false }),
    supabase.from('topic_progress').select('user_id,progress,status'),
    supabase.from('enrollments').select('user_id'),
    supabase.from('test_attempts').select('user_id'),
    supabase.from('dsa_submissions').select('user_id,status'),
    supabase.from('certificates').select('user_id'),
  ]);
  if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 500 });
  const activity: Record<string, { completed: number; enrolled: number; tests: number; solved: number; certs: number }> = {};
  for (const row of progress ?? []) { const x = activity[row.user_id] ?? { completed: 0, enrolled: 0, tests: 0, solved: 0, certs: 0 }; if (row.status === 'completed' || row.progress === 100) x.completed += 1; activity[row.user_id] = x; }
  for (const row of enrollments ?? []) { const x = activity[row.user_id] ?? { completed: 0, enrolled: 0, tests: 0, solved: 0, certs: 0 }; x.enrolled += 1; activity[row.user_id] = x; }
  for (const row of attempts ?? []) { const x = activity[row.user_id] ?? { completed: 0, enrolled: 0, tests: 0, solved: 0, certs: 0 }; x.tests += 1; activity[row.user_id] = x; }
  for (const row of submissions ?? []) { const x = activity[row.user_id] ?? { completed: 0, enrolled: 0, tests: 0, solved: 0, certs: 0 }; if (row.status === 'accepted') x.solved += 1; activity[row.user_id] = x; }
  for (const row of certificates ?? []) { const x = activity[row.user_id] ?? { completed: 0, enrolled: 0, tests: 0, solved: 0, certs: 0 }; x.certs += 1; activity[row.user_id] = x; }
  return NextResponse.json({ users: data ?? [], activity });
}

export async function PATCH(request: Request) {
  const { supabase, response, user } = await admin();
  if (response) return response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const id = typeof body.id === 'string' ? body.id : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : undefined;
  const role = body.role === 'admin' ? 'admin' : body.role === 'user' ? 'user' : undefined;
  if (!id) return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
  if (id === user.id && role === 'user') return NextResponse.json({ error: 'You cannot remove your own admin access.' }, { status: 409 });
  if (role === 'user') { const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'); if ((count ?? 0) <= 1) return NextResponse.json({ error: 'At least one administrator account must remain.' }, { status: 409 }); }
  if (!name && !role) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (role !== undefined) update.role = role;
  const { data, error } = await supabase.from('profiles').update(update).eq('id', id).select('id,name,role,created_at').single();
  if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
  await supabase.from('activity_logs').insert({ user_id: user.id, event_type: 'ADMIN_USER_UPDATED', entity_type: 'profile', entity_id: id, metadata: update });
  return NextResponse.json({ user: data });
}
