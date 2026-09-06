import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { RoadmapView } from '@/components/dashboard/roadmap-view';
import { RoadmapExplorer } from '@/components/dashboard/roadmap-explorer';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type TopicRow = { id: string; title: string; slug: string; summary: string; category_id: string | null; study_categories?: { name: string } | Array<{ name: string }> | null };
type CourseTopicLink = { course_id: string; topic_id: string; sort_order: number };

export default async function RoadmapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const contentClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

  const [{ data: courses, error: coursesError }, { data: enrollments, error: enrollmentsError }, { data: categoryLinks, error: categoryLinksError }] = await Promise.all([
    contentClient.from('courses').select('id,title,slug,description,content').eq('published', true).order('title'),
    supabase.from('enrollments').select('course_id').eq('user_id', user.id),
    contentClient.from('course_categories').select('course_id,category_id,sort_order').order('sort_order'),
  ]);

  const courseIds = (courses ?? []).map((course) => course.id);
  const { data: links, error: linksError } = courseIds.length
    ? await contentClient.from('course_topics').select('course_id,topic_id,sort_order').in('course_id', courseIds).order('sort_order')
    : { data: [] as CourseTopicLink[], error: null };

  const categoryIds = [...new Set((categoryLinks ?? []).map((link) => link.category_id).filter(Boolean))];
  const [{ data: topicRows, error: topicsError }, { data: categoryRows, error: categoriesError }] = await Promise.all([
    contentClient.from('study_topics').select('id,title,slug,summary,category_id,study_categories(name)').eq('published', true).order('sort_order').order('title'),
    categoryIds.length ? contentClient.from('study_categories').select('id,name').in('id', categoryIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const topicMap = new Map((topicRows ?? []).map((topic) => [topic.id, topic as TopicRow]));
  const categoryMap = new Map((categoryRows ?? []).map((category) => [category.id, category.name]));
  const queryError = coursesError ?? enrollmentsError ?? categoryLinksError ?? linksError ?? topicsError ?? categoriesError;
  if (queryError) {
    return <DashboardShell><div className="learner-page dashboard-route-error"><div className="surface empty"><strong>Roadmap unavailable</strong><p>{queryError.message}</p><a className="btn secondary small" href="/dashboard/roadmap">Try again</a></div></div></DashboardShell>;
  }

  const resolvedTopicIds = (topicRows ?? []).map((topic) => topic.id);
  const { data: progressRows } = resolvedTopicIds.length
    ? await supabase.from('topic_progress').select('topic_id,progress').eq('user_id', user.id).in('topic_id', resolvedTopicIds)
    : { data: [] };
  const progress = new Map((progressRows ?? []).map((item) => [item.topic_id, item.progress ?? 0]));

  const enrolledIds = new Set((enrollments ?? []).map((item) => item.course_id));

  function buildTopics(courseId: string) {
    const directLinks = (links ?? []).filter((link) => link.course_id === courseId);
    const courseCategoryIds = (categoryLinks ?? []).filter((link) => link.course_id === courseId).map((link) => link.category_id);
    const sourceTopics = directLinks.length
      ? directLinks.map((link) => topicMap.get(link.topic_id)).filter(Boolean)
      : (topicRows ?? []).filter((topic) => courseCategoryIds.includes(topic.category_id ?? ''));
    return sourceTopics
      .map((topic) => {
        if (!topic) return null;
        const category = Array.isArray(topic.study_categories) ? topic.study_categories[0] : topic.study_categories;
        return { id: topic.id, title: topic.title, slug: topic.slug, summary: topic.summary, categoryName: category?.name ?? categoryMap.get(topic.category_id ?? '') ?? 'General', progress: progress.get(topic.id) ?? 0 };
      })
      .filter((topic): topic is { id: string; title: string; slug: string; summary: string; categoryName: string; progress: number } => Boolean(topic));
  }

  const allRoadmaps = (courses ?? [])
    .map((course) => ({ id: course.id, title: course.title, slug: course.slug, description: course.description ?? '', content: course.content ?? '', topics: buildTopics(course.id) }))
    .filter((course) => course.topics.length);

  const myRoadmaps = allRoadmaps.filter((course) => enrolledIds.has(course.id));
  const availableRoadmaps = allRoadmaps.filter((course) => !enrolledIds.has(course.id));

  const exploreRoadmaps = (courses ?? [])
    .filter((course) => !enrolledIds.has(course.id))
    .map((course) => {
      const topics = buildTopics(course.id);
      const categories = [...new Set((categoryLinks ?? []).filter((link) => link.course_id === course.id).map((link) => categoryMap.get(link.category_id)).filter(Boolean))] as string[];
      return { id: course.id, title: course.title, slug: course.slug, description: course.description ?? '', categories, topicCount: topics.length };
    })
    .filter((course) => course.topicCount > 0);

  const totalTopics = new Set([...myRoadmaps.flatMap((course) => course.topics.map((topic) => topic.id))]).size;
  const completedTopics = myRoadmaps.flatMap((course) => course.topics).filter((topic) => topic.progress === 100).length;

  return (
    <DashboardShell>
      <div className="eyebrow">My learning</div>
      <h1 className="title" style={{ fontSize: 38 }}>Roadmap</h1>
      <p className="subtitle">Follow a structured path across every category — track progress, pick up where you left off, and start new roadmaps anytime.</p>

      <div className="dash-grid" style={{ marginTop: 18 }}>
        <div className="surface dash-card"><div className="kpi-num">{myRoadmaps.length}</div><div className="kpi-label">Roadmaps in progress</div></div>
        <div className="surface dash-card"><div className="kpi-num">{completedTopics}/{totalTopics}</div><div className="kpi-label">Topics completed</div></div>
        <div className="surface dash-card"><div className="kpi-num">{exploreRoadmaps.length}</div><div className="kpi-label">Roadmaps to explore</div></div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div className="section-head"><div><h2 className="title" style={{ fontSize: 22 }}>{myRoadmaps.length ? 'Your roadmaps' : 'Available roadmaps'}</h2><p className="subtitle">{myRoadmaps.length ? 'Continue the courses you have started.' : 'Browse published course topics and start a roadmap when you are ready.'}</p></div></div>
        {myRoadmaps.length || availableRoadmaps.length ? <RoadmapView courses={myRoadmaps.length ? myRoadmaps : availableRoadmaps} /> : <div className="surface empty roadmap-empty-state"><strong>No roadmap topics are linked yet</strong><p>Publish a course and link published topics from the admin course editor to show its learning path here.</p><a className="btn secondary small" href="/study/courses">Browse published courses</a></div>}
      </div>

      {myRoadmaps.length && exploreRoadmaps.length ? (
        <div style={{ marginTop: 28 }}>
          <div className="section-head"><div><h2 className="title" style={{ fontSize: 22 }}>Explore roadmaps</h2><p className="subtitle">Start any published roadmap — it's added to your dashboard instantly.</p></div></div>
          <RoadmapExplorer roadmaps={exploreRoadmaps} />
        </div>
      ) : null}
    </DashboardShell>
  );
}
