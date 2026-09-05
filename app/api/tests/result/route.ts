import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, rateLimitedResponse } from '@/lib/api-security';
export async function GET(request: Request) {
  const limiter = rateLimit(request, { key: 'test-result', limit: 30, windowMs: 60_000 });
  if (!limiter.allowed) return rateLimitedResponse(limiter.retryAfter);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const q = new URL(request.url).searchParams;
  const id = q.get('id'); const attemptId = q.get('attemptId');
  if (!id || !attemptId) return NextResponse.json({ error: 'Test id and attempt id are required.' }, { status: 400 });
  const { data: attempt, error } = await supabase.from('test_attempts').select('id,score,passed,tests(title,passing_score,course_id)').eq('id', attemptId).eq('user_id', user.id).eq('test_id', id).maybeSingle();
  if (error || !attempt) return NextResponse.json({ error: 'Assessment result not found.' }, { status: 404 });
  const test = Array.isArray(attempt.tests) ? attempt.tests[0] : attempt.tests;
  let certificateCode: string | null = null;
  if (test?.course_id && attempt.passed) {
    const { data: certificate } = await supabase.from('certificates').select('certificate_code').eq('user_id', user.id).eq('course_id', test.course_id).is('revoked_at', null).order('issued_at', { ascending: false }).limit(1).maybeSingle();
    certificateCode = certificate?.certificate_code ?? null;
  }
  return NextResponse.json({ score: attempt.score ?? 0, passed: !!attempt.passed, title: test?.title ?? 'Assessment', passing: test?.passing_score ?? 70, certificateCode });
}
