import Link from 'next/link';
import { ArrowUpRight, BookOpen, LockKeyhole, ShieldCheck } from 'lucide-react';

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string;
  access_type: 'free' | 'paid' | string;
  price?: number;
};

export function CourseCard({ course }: { course: Course }) {
  return <Link href={`/study/courses/${course.slug}`} className="surface course-card">
    <div className="course-card-art"><span><BookOpen size={22}/></span><b>{course.access_type === 'paid' ? 'PRO' : 'FREE'}</b></div>
    <div className="course-card-body"><div className="meta-row"><span className={`chip ${course.access_type === 'paid' ? '' : 'active'}`}>{course.access_type === 'paid' ? <><LockKeyhole size={11}/> ₹{course.price ?? 0}</> : 'Open access'}</span><span className="chip"><ShieldCheck size={11}/> Guided path</span></div><h3>{course.title}</h3><p>{course.description || 'A structured learning path built from published StudyHub topics.'}</p><span className="course-card-link">View course <ArrowUpRight size={14}/></span></div>
  </Link>;
}
