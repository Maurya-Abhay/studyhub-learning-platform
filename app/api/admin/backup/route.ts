import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit, rateLimitedResponse } from '@/lib/api-security';

const tables = [
  'profiles', 'study_categories', 'study_modules', 'study_topics', 'courses',
  'course_categories', 'course_topics', 'enrollments', 'topic_progress',
  'study_schedules', 'personal_notes', 'bookmarks', 'questions', 'tests',
  'test_questions', 'test_attempts', 'test_answers', 'dsa_topics',
  'dsa_problems', 'dsa_submissions', 'certificates', 'activity_logs',
] as const;

export async function GET(request: Request) {
  const limiter = rateLimit(request, { key: 'admin-backup', limit: 2, windowMs: 10 * 60_000 });
  if (!limiter.allowed) return rateLimitedResponse(limiter.retryAfter);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return NextResponse.json({ error: 'Backup service is not configured.' }, { status: 503 });
  }

  const result: Record<string, unknown[]> = {};
  const errors: Record<string, string> = {};
  await Promise.all(tables.map(async (table) => {
    const { data, error } = await admin.from(table).select('*');
    if (error) errors[table] = error.message;
    else result[table] = data ?? [];
  }));

  if (Object.keys(errors).length) return NextResponse.json({ error: 'Backup could not include every table.', tables: result, errors }, { status: 502 });

  await admin.from('activity_logs').insert({ user_id: user.id, event_type: 'ADMIN_BACKUP_EXPORTED', entity_type: 'backup', metadata: { tables: tables.length } });
  const backup = { version: 1, generatedAt: new Date().toISOString(), tables: result };
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="studyhub-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      'cache-control': 'no-store',
    },
  });
}