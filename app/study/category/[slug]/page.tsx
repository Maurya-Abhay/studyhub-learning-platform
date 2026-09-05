import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BookOpen } from 'lucide-react';
import { getStudyLibrary } from '@/lib/study-data';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { categories, topics, error } = await getStudyLibrary();
  const category = categories.find((item) => item.slug === slug);
  if (!category || slug === 'dsa') notFound();
  const categoryTopics = topics.filter((topic) => topic.categoryId === category.id);
  return <main className="page category-page"><div className="container category-page-content">
    <div className="breadcrumbs">Study / {category.name}</div>
    <div className="section-head category-page-heading"><div><h1 className="title">{category.name}</h1><p className="subtitle">{category.description || `Explore ${category.name} through focused learning topics.`}</p></div><span className="chip active">{categoryTopics.length} topics</span></div>
    {error ? <div className="surface empty">This category is temporarily unavailable.</div> : categoryTopics.length ? <div className="topic-grid category-topic-grid">{categoryTopics.map((topic, index) => <Link key={topic.id} className="surface card topic-card" href={`/study/topic/${topic.slug}`}><div className="topic-card-number">{String(index + 1).padStart(2, '0')}</div><div className="topic-card-main"><div className="meta-row"><span className="chip active">{topic.difficulty}</span><span className="chip">{topic.estimatedMinutes} min</span></div><h3>{topic.title}</h3><p>{topic.summary || 'Open this topic to start learning.'}</p></div><ArrowRight size={16} className="topic-card-arrow" /></Link>)}</div> : <div className="surface empty category-empty"><div className="empty-icon"><BookOpen size={17}/></div><div><strong>No published topics yet</strong><p>Topics added from the admin portal will appear here automatically.</p></div></div>}
  </div></main>;
}
