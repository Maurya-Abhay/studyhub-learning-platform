import { createClient } from '@/lib/supabase/server';
import { CourseCard } from '@/components/study/course-card';

export default async function CoursesPage() {
  let courses: Array<{id:string;title:string;slug:string;description:string;access_type:string;price:number}> = [];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const { data } = await (await createClient()).from('courses').select('id,title,slug,description,access_type,price').eq('published', true).order('title');
    courses = data ?? [];
  }
  return <main className="page"><div className="container" style={{ padding: '30px 0 54px' }}>
    <div className="section-head courses-page-heading"><div><h1 className="title">Courses</h1><p className="subtitle">Choose a structured path and start learning.</p></div><span className="chip active">{courses.length} published</span></div>
    {courses.length ? <div className="course-card-grid" style={{ marginTop: 20 }}>{courses.map(course => <CourseCard key={course.id} course={course}/>)}</div> : <div className="surface empty" style={{ marginTop: 20 }}><strong>No published courses yet.</strong><p>Published courses will appear here.</p></div>}
  </div></main>;
}
