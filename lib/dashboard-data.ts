import { createClient } from '@/lib/supabase/server';

export async function getDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [profile, progress, enrollments, schedule, bookmarks, certificates, submissions, attempts, notes] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).maybeSingle(),
    supabase.from('topic_progress').select('progress,status,completed_at,topic_id,last_studied_at').eq('user_id', user.id).order('last_studied_at',{ascending:false}),
    supabase.from('enrollments').select('id,course_id,started_at,completed_at,courses(title,slug)').eq('user_id', user.id).order('started_at', { ascending: false }),
    supabase.from('study_schedules').select('id,title,starts_at,duration_minutes,status').eq('user_id', user.id).gte('starts_at', new Date().toISOString()).order('starts_at').limit(6),
    supabase.from('bookmarks').select('topic_id').eq('user_id', user.id),
    supabase.from('certificates').select('id').eq('user_id', user.id),
    supabase.from('dsa_submissions').select('id,status,problem_id,created_at').eq('user_id', user.id),
    supabase.from('test_attempts').select('id,score,passed,submitted_at,test_id,tests(title)').eq('user_id', user.id).order('submitted_at',{ascending:false}).limit(6),
    supabase.from('personal_notes').select('id,content,updated_at,study_topics(id,title,slug)').eq('user_id', user.id).order('updated_at', { ascending: false }),
  ]);
  const queryErrors = [profile, progress, enrollments, schedule, bookmarks, certificates, submissions, attempts, notes].filter((result) => result.error);
  if (queryErrors.length) {
    console.error('Dashboard data failed to load', queryErrors.map((result) => result.error?.message));
    return { error: 'Unable to load dashboard data right now.' };
  }
  const active = progress.data?.filter((item) => item.progress > 0 && item.progress < 100) ?? [];
  const activeIds = active.slice(0, 3).map((item) => item.topic_id);
  const { data: activeTopics, error: activeTopicsError } = activeIds.length
    ? await supabase.from('study_topics').select('id,title,slug').in('id', activeIds)
    : { data: [] as Array<{ id: string; title: string; slug: string }> };
  if (activeTopicsError) {
    console.error('Dashboard topics failed to load', activeTopicsError.message);
    return { error: 'Unable to load dashboard topics right now.' };
  }
  const activeTopicMap = new Map((activeTopics ?? []).map((topic) => [topic.id, topic]));
  const activeWithTopic = active.slice(0, 3).map((item) => ({ ...item, topic: activeTopicMap.get(item.topic_id) ?? null }));
  const accepted = new Set((submissions.data ?? []).filter((item) => item.status === 'accepted' && item.problem_id).map((item) => item.problem_id));
  const completedDates = new Set((progress.data ?? []).filter((item) => item.completed_at).map((item) => new Date(item.completed_at as string).toISOString().slice(0, 10)));
  let streakDays = 0;
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  while (completedDates.has(cursor.toISOString().slice(0, 10))) {
    streakDays += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  const progressRows = progress.data ?? [];
  const averageProgress = progressRows.length ? Math.round(progressRows.reduce((sum, item) => sum + Math.max(0, Math.min(100, item.progress ?? 0)), 0) / progressRows.length) : 0;
  return {
    name: profile.data?.name || user.email?.split('@')[0] || 'Learner',
    completedTopics: progressRows.filter((item) => item.status === 'completed' || item.progress === 100).length,
    averageProgress,
    activeTopics: activeWithTopic,
    courses: enrollments.data ?? [],
    schedule: (schedule.data ?? []).filter((item) => !['cancelled', 'completed'].includes(item.status ?? '')),
    bookmarks: bookmarks.data?.length ?? 0,
    certificates: certificates.data?.length ?? 0,
    solved: accepted.size,
    tests: attempts.data ?? [],
    notes: (notes.data ?? []).map((item) => {
      const topic = Array.isArray(item.study_topics) ? item.study_topics[0] : item.study_topics;
      return { id: item.id, content: item.content, updatedAt: item.updated_at, topicTitle: topic?.title ?? 'Untitled topic', topicSlug: topic?.id };
    }),
    streakDays,
  };
}
