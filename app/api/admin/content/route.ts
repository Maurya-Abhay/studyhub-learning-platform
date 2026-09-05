import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const allowedKinds = ['topics', 'questions', 'tests', 'dsa'] as const;
type Kind = (typeof allowedKinds)[number];

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 120);
}

async function admin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { supabase, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) };
  return { supabase, user };
}

function getBodyString(body: Record<string, unknown>, key: string, fallback = '') {
  return typeof body[key] === 'string' ? String(body[key]).trim() : fallback;
}

function safeList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value;
}

function topicRecord(body: Record<string, unknown>) {
  const details = body.details && typeof body.details === 'object' && !Array.isArray(body.details)
    ? body.details as Record<string, unknown>
    : {};
  const input = { ...details, ...body };
  const title = getBodyString(input, 'title') || getBodyString(input, 'name');
  if (!title) throw new Error('Topic title is required.');
  const categoryId = getBodyString(input, 'categoryId');
  if (!categoryId) throw new Error('Choose a category.');
  return {
    category_id: categoryId,
    title,
    slug: getBodyString(input, 'slug') || slugify(title),
    difficulty: getBodyString(input, 'difficulty', 'Beginner'),
    estimated_minutes: Math.max(1, Number(input.estimatedMinutes ?? input.estimated_minutes) || 10),
    summary: getBodyString(input, 'summary') || getBodyString(input, 'description'),
    concept: getBodyString(input, 'concept'),
    explanation: getBodyString(input, 'explanation'),
    mental_model: getBodyString(input, 'mentalModel') || getBodyString(input, 'mental_model') || null,
    real_example: getBodyString(input, 'realExample') || getBodyString(input, 'real_example') || null,
    code_example: getBodyString(input, 'codeExample') || getBodyString(input, 'code_example') || null,
    code_language: getBodyString(input, 'codeLanguage') || getBodyString(input, 'code_language') || null,
    output: getBodyString(input, 'output') || null,
    common_mistakes: safeList(input.commonMistakes ?? input.common_mistakes),
    practice_task: getBodyString(input, 'practiceTask') || getBodyString(input, 'practice_task') || null,
    interview_questions: safeList(input.interviewQuestions ?? input.interview_questions),
    published: input.published === true,
    sort_order: Math.max(0, Number(input.sortOrder ?? input.sort_order) || 0),
  };
}

function questionRecord(body: Record<string, unknown>) {
  const prompt = getBodyString(body, 'prompt') || getBodyString(body, 'title') || getBodyString(body, 'name');
  if (!prompt) throw new Error('Question prompt is required.');
  const categoryId = getBodyString(body, 'categoryId');
  return {
    category_id: categoryId || null,
    topic_id: getBodyString(body, 'topicId') || null,
    prompt,
    type: getBodyString(body, 'type', 'mcq'),
    options: safeList(body.options),
    answer: body.answer ?? null,
    explanation: getBodyString(body, 'explanation'),
    published: body.published === true,
  };
}

function testRecord(body: Record<string, unknown>) {
  const title = getBodyString(body, 'title') || getBodyString(body, 'name');
  if (!title) throw new Error('Test name is required.');
  return {
    title,
    course_id: getBodyString(body, 'courseId') || null,
    topic_id: getBodyString(body, 'topicId') || null,
    duration_minutes: Math.max(1, Number(body.durationMinutes ?? body.duration_minutes) || 30),
    passing_score: Math.min(100, Math.max(0, Number.isFinite(Number(body.passingScore ?? body.passing_score)) ? Number(body.passingScore ?? body.passing_score) : 70)),
    unlock_days: Math.max(0, Number(body.unlockDays ?? body.unlock_days) || 0),
    required_progress: Math.min(100, Math.max(0, Number.isFinite(Number(body.requiredProgress ?? body.required_progress)) ? Number(body.requiredProgress ?? body.required_progress) : 100)),
    max_attempts: Math.max(1, Number(body.maxAttempts ?? body.max_attempts) || 1),
    random_questions: body.randomQuestions !== false,
    random_options: body.randomOptions !== false,
    published: body.published === true,
  };
}

function dsaRecord(body: Record<string, unknown>) {
  const title = getBodyString(body, 'title') || getBodyString(body, 'name');
  if (!title) throw new Error('Problem title is required.');
  return {
    topic_id: getBodyString(body, 'topicId') || null,
    title,
    slug: getBodyString(body, 'slug') || slugify(title),
    difficulty: getBodyString(body, 'difficulty', 'Easy'),
    pattern: getBodyString(body, 'pattern'),
    summary: getBodyString(body, 'summary'),
    problem: getBodyString(body, 'problem'),
    examples: getBodyString(body, 'examples'),
    constraints: getBodyString(body, 'constraints'),
    hint: getBodyString(body, 'hint'),
    brute_force: getBodyString(body, 'bruteForce') || getBodyString(body, 'brute_force'),
    optimized: getBodyString(body, 'optimized'),
    time_complexity: getBodyString(body, 'timeComplexity') || getBodyString(body, 'time_complexity'),
    space_complexity: getBodyString(body, 'spaceComplexity') || getBodyString(body, 'space_complexity'),
    starter_code: getBodyString(body, 'starterCode') || getBodyString(body, 'starter_code'),
    solution: getBodyString(body, 'solution'),
    test_cases: safeList(body.testCases ?? body.test_cases),
    published: body.published === true,
  };
}

function recordFor(kind: Kind, body: Record<string, unknown>) {
  const details = body.details && typeof body.details === 'object' && !Array.isArray(body.details) ? body.details as Record<string, unknown> : {};
  const input = { ...details, ...body };
  if (kind === 'topics') return topicRecord(input);
  if (kind === 'questions') return questionRecord(input);
  if (kind === 'tests') return testRecord(input);
  return dsaRecord(input);
}

function tableFor(kind: Kind) {
  return kind === 'topics' ? 'study_topics' : kind === 'questions' ? 'questions' : kind === 'tests' ? 'tests' : 'dsa_problems';
}

export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get('kind') as Kind | null;
  if (!kind || !allowedKinds.includes(kind)) return NextResponse.json({ error: 'Unsupported content type.' }, { status: 400 });
  const { supabase, response } = await admin();
  if (response) return response;

  const table = tableFor(kind);
  const order = kind === 'topics' ? 'sort_order' : kind === 'questions' ? 'prompt' : 'title';
  const { data, error } = await supabase.from(table).select('*').order(order, { ascending: true });
  if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 500 });

  const [{ data: categories }, { data: topics }, { data: courses }, { data: tests }, { data: questionRows }] = await Promise.all([
    supabase.from('study_categories').select('id,name').order('sort_order').order('name'),
    supabase.from('study_topics').select('id,title,category_id').order('title'),
    supabase.from('courses').select('id,title').order('title'),
    supabase.from('tests').select('id,title,course_id').order('title'),
    supabase.from('questions').select('id,prompt,category_id').order('prompt'),
  ]);

  let testQuestionIds: Record<string, string[]> = {};
  if (kind === 'tests') {
    const { data: links } = await supabase.from('test_questions').select('test_id,question_id,sort_order').order('sort_order');
    for (const link of links ?? []) testQuestionIds[link.test_id] = [...(testQuestionIds[link.test_id] ?? []), link.question_id];
  }

  return NextResponse.json({
    items: data ?? [],
    categories: categories ?? [],
    topics: topics ?? [],
    courses: courses ?? [],
    tests: tests ?? [],
    questionOptions: (questionRows ?? []).map((q) => ({ id: q.id, prompt: q.prompt, categoryId: q.category_id, categoryName: categories?.find((category) => category.id === q.category_id)?.name ?? 'General' })),
    testQuestionIds,
  });
}

export async function POST(request: Request) {
  const kind = new URL(request.url).searchParams.get('kind') as Kind | null;
  if (!kind || !allowedKinds.includes(kind)) return NextResponse.json({ error: 'Unsupported content type.' }, { status: 400 });
  const { supabase, response, user } = await admin();
  if (response) return response;

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  if (body.action === 'bulk') {
    const records = Array.isArray(body.records) ? body.records : [];
    if (!records.length) return NextResponse.json({ error: 'records must be a non-empty array.' }, { status: 400 });
    if (records.length > 500) return NextResponse.json({ error: 'Bulk imports are limited to 500 records per request.' }, { status: 413 });
    const built = records.map((item) => recordFor(kind, item as Record<string, unknown>)) as Record<string, unknown>[];
    const { data, error } = await supabase.from(tableFor(kind)).insert(built).select();
    if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
    if (kind === 'tests') {
      const testLinks = records.flatMap((item, index) => safeList((item as Record<string, unknown>).questionIds).map((questionId, qIndex) => ({ test_id: data?.[index]?.id, question_id: questionId, sort_order: qIndex })));
      if (testLinks.length) await supabase.from('test_questions').insert(testLinks);
    }
    await supabase.from('activity_logs').insert({ user_id: user.id, event_type: 'ADMIN_BULK_IMPORT', entity_type: kind, metadata: { count: built.length } });
    return NextResponse.json({ items: data ?? [], imported: built.length });
  }

  try {
    const record = recordFor(kind, body) as Record<string, unknown>;
    const { data, error } = await supabase.from(tableFor(kind)).insert(record).select().single();
    if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
    if (kind === 'tests' && Array.isArray(body.questionIds) && body.questionIds.length) {
      const candidateIds = body.questionIds.filter((value): value is string => typeof value === 'string');
      const { data: validQuestions } = await supabase.from('questions').select('id').in('id', candidateIds);
      const validIds = new Set((validQuestions ?? []).map(row => row.id));
      const links = candidateIds.filter(id => validIds.has(id)).map((questionId, index) => ({ test_id: data.id, question_id: questionId, sort_order: index }));
      if (links.length) await supabase.from('test_questions').insert(links);
    }
    await supabase.from('activity_logs').insert({ user_id: user.id, event_type: 'ADMIN_CONTENT_CREATED', entity_type: kind, entity_id: data.id, metadata: { title: data.title ?? data.prompt ?? '' } });
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create record.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const kind = new URL(request.url).searchParams.get('kind') as Kind | null;
  if (!kind || !allowedKinds.includes(kind)) return NextResponse.json({ error: 'Unsupported content type.' }, { status: 400 });
  const { supabase, response } = await admin();
  if (response) return response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  if (kind === 'questions' && body.action === 'set-bank-published') {
    const categoryId = getBodyString(body, 'categoryId');
    const query = supabase.from('questions').update({ published: body.published === true });
    const { error } = categoryId ? await query.eq('category_id', categoryId) : await query.is('category_id', null);
    if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  const id = getBodyString(body, 'id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
  if (body.action === 'toggle-published') {
    const { data, error } = await supabase.from(tableFor(kind)).update({ published: body.published === true }).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
    return NextResponse.json({ item: data });
  }
  try {
    const record = recordFor(kind, body);
    const { data, error } = await supabase.from(tableFor(kind)).update(record).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
    if (kind === 'tests') {
      await supabase.from('test_questions').delete().eq('test_id', id);
      if (Array.isArray(body.questionIds) && body.questionIds.length) {
        const candidateIds = body.questionIds.filter((value): value is string => typeof value === 'string');
        const { data: validQuestions } = await supabase.from('questions').select('id').in('id', candidateIds);
        const validIds = new Set((validQuestions ?? []).map(row => row.id));
        const links = candidateIds.filter(questionId => validIds.has(questionId)).map((questionId, index) => ({ test_id: id, question_id: questionId, sort_order: index }));
        if (links.length) await supabase.from('test_questions').insert(links);
      }
    }
    return NextResponse.json({ item: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update record.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const kind = new URL(request.url).searchParams.get('kind') as Kind | null;
  if (!kind || !allowedKinds.includes(kind)) return NextResponse.json({ error: 'Unsupported content type.' }, { status: 400 });
  const { supabase, response } = await admin();
  if (response) return response;
  if (kind === 'questions') {
    const categoryId = new URL(request.url).searchParams.get('categoryId');
    if (categoryId) {
      const { error } = await supabase.from('questions').delete().eq('category_id', categoryId);
      if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    if (new URL(request.url).searchParams.get('general') === 'true') {
      const { error } = await supabase.from('questions').delete().is('category_id', null);
      if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
  }
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
  const { error } = await supabase.from(tableFor(kind)).delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'The requested operation could not be completed.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}

