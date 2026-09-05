import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit, rateLimitedResponse, readJson } from '@/lib/api-security';

function codeFor(slug: string) {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, '').slice(0, 12).toUpperCase() || 'COURSE';
  return `${safeSlug}-${new Date().getFullYear()}-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
}

export async function GET(request: Request) {
  const limiter = rateLimit(request, { key: 'certificate-verify', limit: 30, windowMs: 60_000 });
  if (!limiter.allowed) return rateLimitedResponse(limiter.retryAfter);
  const code = new URL(request.url).searchParams.get('code')?.trim().slice(0, 100);
  if (!code || !/^[A-Z0-9-]+$/i.test(code)) return NextResponse.json({ error: 'Valid certificate code is required.' }, { status: 400 });
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('certificates').select('certificate_code,issued_at,revoked_at,profiles(name),courses(title,slug)').eq('certificate_code', code).maybeSingle();
    if (error) return NextResponse.json({ error: 'Certificate verification is temporarily unavailable.' }, { status: 503 });
    if (!data) return NextResponse.json({ valid: false, error: 'Certificate not found.' }, { status: 404 });
    const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
    const course = Array.isArray(data.courses) ? data.courses[0] : data.courses;
    return NextResponse.json({ valid: !data.revoked_at, certificate: { certificate_code: data.certificate_code, issued_at: data.issued_at, revoked_at: data.revoked_at, learner_name: profile?.name ?? 'Learner', course_title: course?.title ?? 'Course', course_slug: course?.slug ?? null } }, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' } });
  } catch { return NextResponse.json({ error: 'Certificate verification is temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const limiter = rateLimit(request, { key: `certificate:${user.id}`, limit: 5, windowMs: 60_000 });
  if (!limiter.allowed) return rateLimitedResponse(limiter.retryAfter);
  let body: { attemptId?: unknown };
  try { body = await readJson(request, 4_000); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
  if (!attemptId || attemptId.length > 100) return NextResponse.json({ error: 'attemptId is required.' }, { status: 400 });
  const { data: attempt } = await supabase.from('test_attempts').select('id,test_id,score,passed,tests(course_id,title)').eq('id', attemptId).eq('user_id', user.id).single();
  if (!attempt?.passed) return NextResponse.json({ error: 'Only a passed assessment can issue a certificate.' }, { status: 400 });
  const test = Array.isArray(attempt.tests) ? attempt.tests[0] : attempt.tests;
  if (!test?.course_id) return NextResponse.json({ error: 'This assessment is not attached to a course.' }, { status: 400 });
  const { data: course } = await supabase.from('courses').select('id,slug,certificate_enabled').eq('id', test.course_id).single();
  if (!course?.certificate_enabled) return NextResponse.json({ error: 'Certificates are disabled for this course.' }, { status: 409 });
  try {
    const admin = createAdminClient();
    const { data: existing } = await admin.from('certificates').select('certificate_code,score').eq('user_id', user.id).eq('course_id', course.id).is('revoked_at', null).maybeSingle();
    if (existing) return NextResponse.json({ certificateCode: existing.certificate_code, score: existing.score, reused: true });
    const { data, error } = await admin.from('certificates').insert({ certificate_code: codeFor(course.slug), user_id: user.id, course_id: course.id, score: attempt.score ?? 0 }).select('certificate_code,score,issued_at').single();
    if (error) {
      const { data: raced } = await admin.from('certificates').select('certificate_code,score').eq('user_id', user.id).eq('course_id', course.id).is('revoked_at', null).maybeSingle();
      if (raced) return NextResponse.json({ certificateCode: raced.certificate_code, score: raced.score, reused: true });
      return NextResponse.json({ error: 'Unable to issue certificate.' }, { status: 409 });
    }
    return NextResponse.json({ certificateCode: data.certificate_code, score: data.score, issuedAt: data.issued_at }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Certificate issuing is temporarily unavailable.' }, { status: 503 }); }
}
