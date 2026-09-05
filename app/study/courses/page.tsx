import { getStudyLibrary } from '@/lib/study-data';
import { createClient } from '@/lib/supabase/server';
import { CourseCard } from '@/components/study/course-card';

export default async function CoursesPage() {
  const library = await getStudyLibrary();
  let courses: Array<{id:string;title:string;slug:string;description:string;access_type:string;price:number}> = [];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const { data } = await (await createClient()).from('courses').select('id,title,slug,description,access_type,price').eq('published', true).order('title');
    courses = data ?? [];
  }
  return <main className="page"><div className="container" style={{ padding: '34px 0 60px' }}>
    <div className="eyebrow">Learning paths</div><div className="section-head"><div><h1 className="title" style={{ fontSize: 46, marginTop: 8 }}>Courses built from your library.</h1><p className="subtitle" style={{ maxWidth: 760 }}>Every card below is backed by the live course records and stays in sync with the topics and categories managed in the admin workspace.</p></div><span className="chip active">{courses?.length ?? 0} published</span></div>
    {courses?.length ? <div className="course-card-grid" style={{ marginTop: 22 }}>{courses.map(course => <CourseCard key={course.id} course={course}/>)}</div> : <div className="surface empty" style={{ marginTop: 22 }}><strong>No published courses yet.</strong><p>Publish a course from Admin → Courses to make it visible here.</p></div>}
    <div className="surface card library-footnote"><div><div className="eyebrow">Library</div><strong>{library.categories.length} categories · {library.topics.length} topics</strong><p className="small muted">Need to learn a single concept instead? Browse the complete public library.</p></div><a className="btn secondary small" href="/study">Open library</a></div>
  </div></main>;
}
