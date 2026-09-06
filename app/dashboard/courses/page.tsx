import Link from 'next/link';
import { BookOpen, CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { CourseTopicExplorer } from '@/components/dashboard/course-topic-explorer';
import { EnrollButton } from '@/components/study/enroll-button';
import { createClient } from '@/lib/supabase/server';

type Course = { id: string; title: string; slug: string; description: string; content?: string | null; access_type: string; price: number; unlock_days: number; required_progress: number; passing_score: number; certificate_enabled: boolean };
type Topic = { id: string; title: string; slug: string; summary: string; category_id: string | null; study_categories?: { name: string } | Array<{ name: string }> | null };

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course: selectedSlug } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: courses } = await supabase.from('courses').select('id,title,slug,description,content,access_type,price,unlock_days,required_progress,passing_score,certificate_enabled').eq('published', true).order('title');
  const { data: enrollments } = await supabase.from('enrollments').select('course_id').eq('user_id', user.id);
  const enrolledIds = new Set((enrollments ?? []).map((item) => item.course_id));
  const selectedCourse = (courses ?? []).find((course) => course.slug === selectedSlug);
  const { data: links } = selectedCourse
    ? await supabase.from('course_topics').select('course_id,sort_order,study_topics(id,title,slug,summary,category_id,study_categories(name))').eq('course_id', selectedCourse.id).order('sort_order')
    : { data: [] };
  const topics = (links ?? []).map((link) => (Array.isArray(link.study_topics) ? link.study_topics[0] : link.study_topics) as Topic).filter(Boolean);
  const { data: progressRows } = selectedCourse && topics.length
    ? await supabase.from('topic_progress').select('topic_id,progress').eq('user_id', user.id).in('topic_id', topics.map((topic) => topic.id))
    : { data: [] };
  const progress = new Map((progressRows ?? []).map((item) => [item.topic_id, item.progress ?? 0]));
  const explorerTopics = topics.map((topic) => {
    const category = Array.isArray(topic.study_categories) ? topic.study_categories[0] : topic.study_categories;
    return { id: topic.id, title: topic.title, slug: topic.slug, summary: topic.summary, categoryName: category?.name ?? 'General', progress: progress.get(topic.id) ?? 0 };
  });
  const isEnrolled = selectedCourse ? enrolledIds.has(selectedCourse.id) : false;
  const courseTerms = (course: Course) => [
    `Complete at least ${course.required_progress}% of the course to unlock the final assessment.`,
    `The final assessment unlocks after ${course.unlock_days} day(s) from enrollment.`,
    `Pass the final assessment with a score of ${course.passing_score}% or higher.`,
    course.certificate_enabled ? 'A certificate is issued after completing the course requirements.' : 'This course does not include a certificate.',
  ];

  return <DashboardShell>
    {selectedCourse ? <>
      <div className="breadcrumbs dashboard-course-breadcrumb">Dashboard / Courses / {selectedCourse.title}</div>
      <section className="surface card dashboard-course-detail dashboard-course-selected">
      <div className="dashboard-course-detail-head">
        <div>
          <div className="meta-row"><span className="chip active">{isEnrolled ? 'Enrolled' : 'Not enrolled'}</span><span className="chip"><ShieldCheck size={11} /> {topics.length} topics</span></div>
        </div>
        <BookOpen className="dashboard-course-detail-icon" size={22} />
      </div>
      <CourseTopicExplorer topics={explorerTopics} enrolled={isEnrolled} />
      <div className="dashboard-course-footer">
        <Link className="small link" href="/dashboard/courses">Back to all courses</Link>
        <div className="dashboard-course-actions">
          {isEnrolled ? null : selectedCourse.access_type === 'paid' ? <span className="small muted"><LockKeyhole size={13} /> Checkout unavailable</span> : <EnrollButton courseId={selectedCourse.id} courseTitle={selectedCourse.title} terms={courseTerms(selectedCourse)} redirectPath={`/dashboard/courses?course=${encodeURIComponent(selectedCourse.slug)}`} />}
        </div>
      </div>
      </section>
      </> : <>
        <div className="breadcrumbs dashboard-course-breadcrumb">Dashboard / Courses</div>
        <div className="section-head dashboard-courses-heading"><h1 className="title" style={{ fontSize: 26 }}>Courses</h1><span className="chip active">{courses?.length ?? 0} available</span></div>
    {courses?.length ? <div className="course-card-grid dashboard-course-grid">
      {courses.map((course) => <article className="surface course-card dashboard-course-card" key={course.id}>
        <div className="course-card-art"><span><BookOpen size={22} /></span><b>{course.access_type === 'paid' ? 'PRO' : 'FREE'}</b></div>
        <div className="course-card-body">
          <div className="meta-row"><span className={`chip ${course.access_type === 'paid' ? '' : 'active'}`}>{course.access_type === 'paid' ? <><LockKeyhole size={11} /> INR {course.price ?? 0}</> : 'Open access'}</span>{enrolledIds.has(course.id) && <span className="chip active"><CheckCircle2 size={11} /> Enrolled</span>}</div>
          <h3>{course.title}</h3>
          <p>{course.description || 'A structured learning path built from published StudyHub topics.'}</p>
          <div className="dashboard-course-actions"><Link className="btn secondary small" href={`/dashboard/courses?course=${encodeURIComponent(course.slug)}`}>View all topics</Link>{enrolledIds.has(course.id) ? <Link className="btn primary small" href={`/dashboard/courses?course=${encodeURIComponent(course.slug)}`}>Continue learning</Link> : course.access_type === 'paid' ? <span className="small muted">Checkout unavailable</span> : <EnrollButton courseId={course.id} courseTitle={course.title} terms={courseTerms(course)} redirectPath={`/dashboard/courses?course=${encodeURIComponent(course.slug)}`} />}</div>
        </div>
      </article>)}
    </div> : <div className="surface empty">No published courses are available yet.</div>}</>}
  </DashboardShell>;
}
