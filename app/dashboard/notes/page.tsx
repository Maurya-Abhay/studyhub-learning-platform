import Link from 'next/link';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { NotesPanel } from '@/components/dashboard/notes-panel';
import { RoadmapView } from '@/components/dashboard/roadmap-view';
import { TopicWorkspace } from '@/components/study/topic-workspace';
import { createClient } from '@/lib/supabase/server';
import { getTopicBySlug } from '@/lib/study-data';

type CourseTopic = { id: string; title: string; slug: string; summary: string; category_id: string | null; sort_order: number; study_categories?: { name: string } | Array<{ name: string }> | null };

export default async function Page({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic: topicSlug } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: enrollments } = await supabase.from('enrollments').select('course_id,courses(id,title,slug)').eq('user_id', user.id).order('started_at', { ascending: false });
  const courseIds = (enrollments ?? []).map((item) => item.course_id);
  const { data: links } = courseIds.length ? await supabase.from('course_topics').select('course_id,sort_order,study_topics(id,title,slug,summary,category_id,study_categories(name))').in('course_id', courseIds).order('sort_order') : { data: [] };
  const topicIds = (links ?? []).map((link) => { const topic = Array.isArray(link.study_topics) ? link.study_topics[0] : link.study_topics; return topic?.id; }).filter(Boolean) as string[];
  const { data: noteRows } = topicIds.length
    ? await supabase.from('personal_notes').select('id,content,updated_at,study_topics(id,title,slug)').eq('user_id', user.id).in('topic_id', topicIds).order('updated_at', { ascending: false })
    : { data: [] };
  const notes = (noteRows ?? []).map((item) => { const topic = Array.isArray(item.study_topics) ? item.study_topics[0] : item.study_topics; return { id: item.id, content: item.content, updatedAt: item.updated_at, topicTitle: topic?.title ?? 'Untitled topic', topicSlug: topic?.slug, topicId: topic?.id }; });
  const { data: progressRows } = topicIds.length ? await supabase.from('topic_progress').select('topic_id,progress').eq('user_id', user.id).in('topic_id', topicIds) : { data: [] };
  const progress = new Map((progressRows ?? []).map((item) => [item.topic_id, item.progress ?? 0]));
  const roadmaps = (enrollments ?? []).map((enrollment) => { const course = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses; const topics = (links ?? []).filter((link) => link.course_id === enrollment.course_id).map((link) => { const topic = (Array.isArray(link.study_topics) ? link.study_topics[0] : link.study_topics) as CourseTopic | null; if (!topic) return null; const category = Array.isArray(topic.study_categories) ? topic.study_categories[0] : topic.study_categories; return { id: topic.id, title: topic.title, slug: topic.slug, summary: topic.summary, categoryName: category?.name ?? 'General', progress: progress.get(topic.id) ?? 0 }; }).filter((topic): topic is { id: string; title: string; slug: string; summary: string; categoryName: string; progress: number } => Boolean(topic)); return { id: course?.id ?? enrollment.course_id, title: course?.title ?? 'Course roadmap', slug: course?.slug ?? '', topics }; }).filter((course) => course.topics.length);

  let selectedTopic;
  let selectedCategory;
  let selectedLibrary;
  let selectedProgress = 0;
  let selectedNote = '';
  if (topicSlug) {
    const result = await getTopicBySlug(topicSlug);
    selectedTopic = result.topic;
    selectedCategory = result.category;
    selectedLibrary = result.library;
    if (selectedTopic && topicIds.includes(selectedTopic.id)) {
      const [{ data: selectedProgressRow }, { data: savedNote }] = await Promise.all([
        supabase.from('topic_progress').select('progress').eq('user_id', user.id).eq('topic_id', selectedTopic.id).maybeSingle(),
        supabase.from('personal_notes').select('content').eq('user_id', user.id).eq('topic_id', selectedTopic.id).maybeSingle(),
      ]);
      selectedProgress = selectedProgressRow?.progress ?? 0;
      selectedNote = savedNote?.content ?? '';
    } else {
      selectedTopic = undefined;
      selectedCategory = undefined;
      selectedLibrary = undefined;
    }
  }

  const activeCourse = selectedTopic ? roadmaps.find((course) => course.topics.some((item) => item.id === selectedTopic.id)) : undefined;
    return <DashboardShell><div className="dashboard-notes-page"><div className="eyebrow">Smart learning</div><h1 className="title" style={{ fontSize: 38 }}>{selectedTopic ? selectedTopic.title : 'Smart Learning'}</h1><p className="subtitle">{selectedTopic ? 'Study this topic, save notes, and continue through your course path.' : 'Your next topic, course path, progress and notes in one focused workspace.'}</p>{selectedTopic && selectedLibrary ? <div className="dashboard-topic-reader"><TopicWorkspace topic={selectedTopic} category={selectedCategory} prev={selectedLibrary.topics[selectedLibrary.topics.findIndex((item) => item.id === selectedTopic.id) - 1]} next={selectedLibrary.topics[selectedLibrary.topics.findIndex((item) => item.id === selectedTopic.id) + 1]} initialProgress={selectedProgress} initialNote={selectedNote} portalPath="/dashboard/notes" courseTitle={activeCourse?.title} courseTopics={activeCourse?.topics} /></div> : courseIds.length ? <><div className="dashboard-section-heading"><h2>Your learning path</h2><Link className="small link" href="/dashboard/roadmap">Open full path <span aria-hidden="true">→</span></Link></div><RoadmapView courses={roadmaps} /><section className="surface card notes-reader-surface"><div className="dashboard-section-heading"><h2>Topic notes</h2><span className="small muted">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span></div><NotesPanel notes={notes} /></section></> : <section className="surface card learner-empty-state"><div className="eyebrow">Start learning</div><h2>No course enrolled yet</h2><p>Choose a course first. Your smart learning path, progress and topic notes will appear here after enrollment.</p><Link className="btn primary small" href="/dashboard/courses">Browse courses</Link></section>}</div></DashboardShell>;
}
