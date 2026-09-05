import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { supabase, error: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) };
  return { supabase };
}

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 120); }
function stringIds(value: unknown) { return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))] : []; }

export async function GET() {
  const { supabase, error } = await adminClient();
  if (error) return error;
  const [coursesResult, categoryLinksResult, topicLinksResult] = await Promise.all([
    supabase.from('courses').select('id,title,slug,description,content,published').order('title'),
    supabase.from('course_categories').select('course_id,category_id,study_categories(name)').order('sort_order'),
    supabase.from('course_topics').select('course_id,topic_id,sort_order').order('sort_order'),
  ]);
  const queryError = coursesResult.error || categoryLinksResult.error || topicLinksResult.error;
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });
  const courses = coursesResult.data;
  const categoryLinks = categoryLinksResult.data;
  const topicLinks = topicLinksResult.data;
  return NextResponse.json({ roadmaps: (courses ?? []).map((course) => { const courseCategoryLinks = (categoryLinks ?? []).filter((link) => link.course_id === course.id); return { ...course, categoryIds: courseCategoryLinks.map((link) => link.category_id), topicIds: (topicLinks ?? []).filter((link) => link.course_id === course.id).map((link) => link.topic_id), categories: courseCategoryLinks.map((link) => { const category = Array.isArray(link.study_categories) ? link.study_categories[0] : link.study_categories; return category ? { id: link.category_id, name: category.name } : null; }).filter(Boolean) }; }) });
}

async function syncRoadmap(supabase: Awaited<ReturnType<typeof createClient>>, id: string, categoryIds: string[], topicIds: string[]) {
  const categoryDelete = await supabase.from('course_categories').delete().eq('course_id', id);
  if (categoryDelete.error) throw new Error(categoryDelete.error.message);
  const topicDelete = await supabase.from('course_topics').delete().eq('course_id', id);
  if (topicDelete.error) throw new Error(topicDelete.error.message);
  if (categoryIds.length) {
    const categoryInsert = await supabase.from('course_categories').insert(categoryIds.map((categoryId, index) => ({ course_id: id, category_id: categoryId, sort_order: index })));
    if (categoryInsert.error) throw new Error(categoryInsert.error.message);
  }
  let selectedTopics = topicIds;
  if (!selectedTopics.length && categoryIds.length) {
    const { data } = await supabase.from('study_topics').select('id,sort_order').in('category_id', categoryIds).eq('published', true).order('sort_order').order('title');
    selectedTopics = (data ?? []).map((topic) => topic.id);
  }
  if (selectedTopics.length) {
    const topicInsert = await supabase.from('course_topics').insert(selectedTopics.map((topicId, index) => ({ course_id: id, topic_id: topicId, sort_order: index })));
    if (topicInsert.error) throw new Error(topicInsert.error.message);
  }
}

export async function POST(request: Request) {
  const { supabase, error } = await adminClient();
  if (error) return error;
  let body: { records?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const records = Array.isArray(body.records) ? body.records : [];
  if (!records.length) return NextResponse.json({ error: 'records must be a non-empty array.' }, { status: 400 });
    if (records.length > 500) return NextResponse.json({ error: 'Bulk imports are limited to 500 records per request.' }, { status: 413 });
  const created = [];
  for (const raw of records) {
    const item = raw as Record<string, unknown>;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    if (!title) return NextResponse.json({ error: 'Every roadmap needs a title.' }, { status: 400 });
    const categoryIds = stringIds(item.categoryIds);
    const topicIds = stringIds(item.topicIds);
    const { data: course, error: courseError } = await supabase.from('courses').insert({ title, slug: typeof item.slug === 'string' && item.slug ? item.slug : slugify(title), description: typeof item.description === 'string' ? item.description : '', content: typeof item.content === 'string' ? item.content : '', access_type: 'free', price: 0, unlock_days: 0, required_progress: Number(item.requiredProgress ?? 100), passing_score: 70, certificate_enabled: item.certificateEnabled !== false, published: item.published !== false }).select('id,title,slug').single();
    if (courseError) return NextResponse.json({ error: courseError.message }, { status: 400 });
    if (categoryIds.length) await supabase.from('course_categories').insert(categoryIds.map((categoryId, index) => ({ course_id: course.id, category_id: categoryId, sort_order: index })));
    let selectedTopics = topicIds;
    if (!selectedTopics.length && categoryIds.length) {
      const { data: categoryTopics } = await supabase.from('study_topics').select('id,sort_order').in('category_id', categoryIds).eq('published', true).order('sort_order').order('title');
      selectedTopics = (categoryTopics ?? []).map((topic) => topic.id);
    }
    if (selectedTopics.length) await supabase.from('course_topics').insert(selectedTopics.map((topicId, index) => ({ course_id: course.id, topic_id: topicId, sort_order: index })));
    created.push(course);
  }
  return NextResponse.json({ roadmaps: created, imported: created.length }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { supabase, error } = await adminClient();
  if (error) return error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const id = typeof body.id === 'string' ? body.id : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!id || !title) return NextResponse.json({ error: 'Roadmap id and title are required.' }, { status: 400 });
  const { data: roadmap, error: updateError } = await supabase.from('courses').update({ title, description: typeof body.description === 'string' ? body.description : '', content: typeof body.content === 'string' ? body.content : '', published: body.published !== false, required_progress: Number(body.requiredProgress ?? 100) }).eq('id', id).select('id,title,slug').single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  try {
    await syncRoadmap(supabase, id, stringIds(body.categoryIds), stringIds(body.topicIds));
  } catch (syncError) {
    return NextResponse.json({ error: syncError instanceof Error ? syncError.message : 'Unable to sync roadmap links.' }, { status: 400 });
  }
  return NextResponse.json({ roadmap });
}
