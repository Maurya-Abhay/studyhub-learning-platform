import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { EnrollButton } from '@/components/study/enroll-button';
import { CourseSyllabus } from '@/components/study/course-syllabus';

type Topic = { id: string; title: string; slug: string; summary: string; estimated_minutes: number; category_id: string | null; study_categories?: { name: string } | { name: string }[] | null };

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase.from('courses').select('id,title,slug,description,access_type,price,unlock_days,required_progress,passing_score,certificate_enabled,published').eq('slug', slug).eq('published', true).maybeSingle();
  if (!course) notFound();

  const { data: links } = await supabase.from('course_topics').select('sort_order,study_topics(id,title,slug,summary,estimated_minutes,category_id,study_categories(name))').eq('course_id', course.id).order('sort_order');
  const topics = (links ?? []).map((link) => (Array.isArray(link.study_topics) ? link.study_topics[0] : link.study_topics) as Topic).filter(Boolean);
  const topicGroups = Object.values(topics.reduce<Record<string, { name: string; topics: Topic[] }>>((groups, topic) => {
    const category = Array.isArray(topic.study_categories) ? topic.study_categories[0] : topic.study_categories;
    const key = topic.category_id ?? 'uncategorized';
    groups[key] ??= { name: category?.name ?? 'Other topics', topics: [] };
    groups[key].topics.push(topic);
    return groups;
  }, {})).map((group) => ({ name: group.name, topics: group.topics.map(({ id, title, summary, estimated_minutes }) => ({ id, title, summary, estimated_minutes })) }));

  const totalMinutes = topics.reduce((total, topic) => total + (topic.estimated_minutes || 0), 0);
  const { data: { user } } = await supabase.auth.getUser();
  const { data: enrollment } = user ? await supabase.from('enrollments').select('started_at').eq('user_id', user.id).eq('course_id', course.id).maybeSingle() : { data: null };
  const topicIds = topics.map((topic) => topic.id);
  const { data: progressRows } = user && topicIds.length ? await supabase.from('topic_progress').select('topic_id,progress').eq('user_id', user.id).in('topic_id', topicIds) : { data: [] };
  const progressPercent = topicIds.length ? Math.round(topicIds.reduce((sum, id) => sum + (progressRows?.find((row) => row.topic_id === id)?.progress ?? 0), 0) / topicIds.length) : 0;
  const unlockAt = enrollment ? new Date(new Date(enrollment.started_at).getTime() + course.unlock_days * 86400000) : null;
  const eligible = Boolean(enrollment && progressPercent >= course.required_progress && (!unlockAt || Date.now() >= unlockAt.getTime()));
  const { data: test } = user ? await supabase.from('tests').select('id,title').eq('course_id', course.id).eq('published', true).order('title').limit(1).maybeSingle() : { data: null };
  const courseTerms = [
    `Complete at least ${course.required_progress}% of the course to unlock the final assessment.`,
    `The final assessment unlocks after ${course.unlock_days} day(s) from enrollment.`,
    `Pass the final assessment with a score of ${course.passing_score}% or higher.`,
    course.certificate_enabled ? 'A certificate is issued after completing the course requirements.' : 'This course does not include a certificate.',
  ];

  return <main className="page"><div className="container course-page">
    <div className="breadcrumbs">Study / Courses / {course.title}</div>
    <div className="surface card course-hero">
      <div><span className="chip active">{course.access_type === 'free' ? 'Free course' : `Paid · ${course.price}`}</span><h1 className="title" style={{ fontSize: 42, marginTop: 8 }}>{course.title}</h1><p className="subtitle course-description">{course.description}</p><div className="meta-row" style={{ marginTop: 12 }}><span className="chip">{topics.length} topics</span><span className="chip">{Math.max(1, Math.ceil(totalMinutes / 60))}h estimated</span>{course.certificate_enabled && <span className="chip"><ShieldCheck size={12} />Certificate</span>}</div></div>
      <div className="course-action-box">{enrollment ? <><div className="eyebrow">Your progress</div><strong className="course-progress-number">{progressPercent}%</strong><div className="progress" style={{ margin: '8px 0 12px' }}><span style={{ width: `${progressPercent}%` }} /></div>{test ? eligible ? <Link className="btn primary" href={`/tests/${test.id}`}><CheckCircle2 size={14} />Start final test</Link> : <div className="notice"><LockKeyhole size={13} /> {progressPercent < course.required_progress ? `Complete ${course.required_progress}% of the course.` : `Final test unlocks ${unlockAt?.toLocaleString() ?? 'soon'}.`}</div> : <div className="notice">No final test is published yet.</div>}</> : course.access_type === 'paid' ? <div className="notice"><LockKeyhole size={13} /> Paid enrollment requires checkout. Payment is not configured in this workspace yet.</div> : <EnrollButton courseId={course.id} courseTitle={course.title} terms={courseTerms} redirectPath={`/dashboard/courses?course=${encodeURIComponent(course.slug)}`} />}</div>
    </div>
    <section className="surface card course-syllabus"><div className="section-head course-syllabus-head"><div><div className="eyebrow">Course syllabus</div><h2 className="title">Topics by category</h2></div><span className="chip active">{topicGroups.length} categories</span></div>{topicGroups.length ? <CourseSyllabus groups={topicGroups} /> : <div className="empty">No topics are assigned to this course yet.</div>}</section>
  </div></main>;
}
