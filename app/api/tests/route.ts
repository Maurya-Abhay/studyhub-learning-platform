import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/activity';

type AnswerMap = Record<string, unknown>;

type TestRow = {
  id: string; title: string; duration_minutes: number; passing_score: number; unlock_days: number; required_progress: number; published: boolean; course_id: string | null; max_attempts: number; random_questions: boolean; random_options: boolean;
};

async function auth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

function sameAnswer(a: unknown, b: unknown) {
  if (typeof a === 'string' && typeof b === 'string') return a.trim() === b.trim();
  return JSON.stringify(a) === JSON.stringify(b);
}

async function checkEligibility(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, testId: string) {
  const { data: test, error } = await supabase.from('tests').select('id,title,duration_minutes,passing_score,unlock_days,required_progress,published,course_id,max_attempts,random_questions,random_options').eq('id', testId).single();
  if (error || !test?.published) return { error: 'Test is not available.', status: 404 as const };
  const typed = test as TestRow;
  if (!typed.course_id) return { test: typed };

  const { data: enrollment } = await supabase.from('enrollments').select('started_at').eq('user_id', userId).eq('course_id', typed.course_id).maybeSingle();
  if (!enrollment) return { error: 'Enroll in the course before starting this assessment.', status: 403 as const };
  const elapsedDays = (Date.now() - new Date(enrollment.started_at).getTime()) / 86_400_000;
  if (elapsedDays < typed.unlock_days) return { error: `This assessment unlocks after ${typed.unlock_days} days of enrollment.`, status: 403 as const };

  const { data: courseTopics } = await supabase.from('course_topics').select('topic_id').eq('course_id', typed.course_id);
  const topicIds = (courseTopics ?? []).map((item) => item.topic_id);
  if (topicIds.length && typed.required_progress > 0) {
    const { data: progressRows } = await supabase.from('topic_progress').select('topic_id,progress').eq('user_id', userId).in('topic_id', topicIds);
    const total = topicIds.reduce((sum, id) => sum + (progressRows?.find((row) => row.topic_id === id)?.progress ?? 0), 0);
    const average = total / topicIds.length;
    if (average < typed.required_progress) return { error: `Complete at least ${typed.required_progress}% of the course before starting this assessment.`, status: 403 as const };
  }
  return { test: typed };
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function GET(request: Request) {
  const { supabase, user } = await auth();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Test id is required.' }, { status: 400 });
  const result = await checkEligibility(supabase, user.id, id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  const { data, error } = await supabase.from('test_questions').select('question_id,sort_order,questions(id,prompt,type,options)').eq('test_id', id).order('sort_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const questionRows = (data ?? []).map((item) => {
    const question = Array.isArray(item.questions) ? item.questions[0] : item.questions;
    if (!question) return null;
    return { id: question.id, prompt: question.prompt, type: question.type, options: Array.isArray(question.options) ? question.options : [] };
  }).filter((question): question is { id: string; prompt: string; type: string; options: unknown[] } => Boolean(question));
  const questions = result.test?.random_questions === false ? questionRows : shuffle(questionRows);
  const preparedQuestions = questions.map((question) => ({ ...question, options: result.test?.random_options === false ? question.options : shuffle(question.options) }));
  return NextResponse.json({ test: result.test, questions: preparedQuestions });
}

export async function POST(request: Request) {
  const { supabase, user } = await auth();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  let body: { action?: unknown; testId?: unknown; attemptId?: unknown; answers?: unknown; suspiciousEvents?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const testId = typeof body.testId === 'string' ? body.testId : '';
  if (!testId) return NextResponse.json({ error: 'testId is required.' }, { status: 400 });
  const result = await checkEligibility(supabase, user.id, testId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

  if (body.action === 'start') {
    const { data: submittedAttempts, count: submittedCount } = await supabase.from('test_attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('test_id', testId).not('submitted_at', 'is', null);
    if ((submittedCount ?? submittedAttempts?.length ?? 0) >= (result.test?.max_attempts ?? 1)) return NextResponse.json({ error: `Maximum attempts reached (${result.test?.max_attempts ?? 1}).` }, { status: 409 });
    const { data: existing } = await supabase.from('test_attempts').select('id,started_at').eq('user_id', user.id).eq('test_id', testId).is('submitted_at', null).order('started_at', { ascending: false }).limit(1).maybeSingle();
    if (existing) return NextResponse.json({ attempt: existing });
    const { data: attempt, error } = await supabase.from('test_attempts').insert({ user_id: user.id, test_id: testId }).select('id,started_at').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ attempt }, { status: 201 });
  }

  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
  const answers = body.answers && typeof body.answers === 'object' ? body.answers as AnswerMap : null;
  if (!attemptId || !answers) return NextResponse.json({ error: 'attemptId and answers are required.' }, { status: 400 });

  const { data: attempt } = await supabase.from('test_attempts').select('id,started_at,submitted_at').eq('id', attemptId).eq('user_id', user.id).eq('test_id', testId).single();
  if (!attempt || attempt.submitted_at) return NextResponse.json({ error: 'Attempt is not active.' }, { status: 409 });
  const elapsed = Date.now() - new Date(attempt.started_at).getTime();
  const allowed = ((result.test?.duration_minutes ?? 30) * 60 * 1000) + 10_000;
  if (elapsed > allowed) return NextResponse.json({ error: 'This assessment attempt has expired.' }, { status: 409 });

  const { data: assignedRows } = await supabase.from('test_questions').select('question_id').eq('test_id', testId);
  const assignedIds = new Set((assignedRows ?? []).map((row) => row.question_id));
  const questionEntries = Object.entries(answers).filter(([question_id]) => assignedIds.has(question_id)).map(([question_id, answer]) => ({ attempt_id: attemptId, question_id, answer }));
  if (questionEntries.length) {
    const { error } = await supabase.from('test_answers').upsert(questionEntries, { onConflict: 'attempt_id,question_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const suspicious = Array.isArray(body.suspiciousEvents) ? body.suspiciousEvents.slice(0, 50) : [];
  if (body.action === 'save') {
    await supabase.from('test_attempts').update({ suspicious_events: suspicious }).eq('id', attemptId).eq('user_id', user.id);
    return NextResponse.json({ ok: true });
  }

  const { data: questions } = await supabase.from('test_questions').select('question_id,questions(answer)').eq('test_id', testId);
  const correct = (questions ?? []).filter((item) => {
    const question = Array.isArray(item.questions) ? item.questions[0] : item.questions;
    return question ? sameAnswer(answers[item.question_id], question.answer) : false;
  }).length;
  const total = questions?.length ?? 0;
  const score = Math.round(correct / Math.max(total, 1) * 100);
  const passed = score >= (result.test?.passing_score ?? 70);
  const answerUpdates = (questions ?? []).flatMap((item) => { const question = Array.isArray(item.questions) ? item.questions[0] : item.questions; return question ? [{ question_id: item.question_id, is_correct: sameAnswer(answers[item.question_id], question.answer) }] : []; });
  if (answerUpdates.length) await Promise.all(answerUpdates.map((item) => supabase.from('test_answers').update({ is_correct: item.is_correct }).eq('attempt_id', attemptId).eq('question_id', item.question_id)));
  const { error: updateError } = await supabase.from('test_attempts').update({ submitted_at: new Date().toISOString(), score, passed, suspicious_events: suspicious }).eq('id', attemptId).eq('user_id', user.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  let certificateCode: string | null = null;
  if (passed && result.test?.course_id) {
    const { data: course } = await supabase.from('courses').select('certificate_enabled,slug').eq('id', result.test.course_id).single();
    if (course?.certificate_enabled) {
      try {
        const admin = createAdminClient();
        const { data: existing } = await admin.from('certificates').select('certificate_code').eq('user_id', user.id).eq('course_id', result.test.course_id).is('revoked_at', null).maybeSingle();
        if (existing?.certificate_code) certificateCode = existing.certificate_code;
        else {
          const code = `${course.slug.slice(0, 12).toUpperCase()}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
          const { data: certificate } = await admin.from('certificates').insert({ certificate_code: code, user_id: user.id, course_id: result.test.course_id, score }).select('certificate_code').single();
          certificateCode = certificate?.certificate_code ?? null;
        }
      } catch {
        // Certificate creation stays optional until the server-only service key is configured.
      }
    }
  }
  await logActivity(supabase,user.id,'test_submitted','test',testId,{score,passed,attemptId});
  if(certificateCode) await logActivity(supabase,user.id,'certificate_issued','certificate',undefined,{certificateCode,testId});
  return NextResponse.json({ score, passed, correct, total, attemptId, certificateCode });
}
