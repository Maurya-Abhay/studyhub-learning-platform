'use client';

import Link from 'next/link';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { useState } from 'react';

type RoadmapTopic = { id: string; title: string; slug: string; summary: string; categoryName: string; progress: number };
type RoadmapCourse = { id: string; title: string; slug: string; description?: string; content?: string; topics: RoadmapTopic[] };

export function RoadmapView({ courses }: { courses: RoadmapCourse[] }) {
  const [items, setItems] = useState(courses);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function complete(topicId: string) {
    setBusy(topicId);
    setMessage('');
    try {
      const response = await fetch('/api/progress', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topicId, progress: 100 }) });
      if (response.ok) setItems((current) => current.map((course) => ({ ...course, topics: course.topics.map((topic) => topic.id === topicId ? { ...topic, progress: 100 } : topic) })));
      else {
        const data = await response.json().catch(() => ({}));
        setMessage(data.error || 'Unable to update progress.');
      }
    } catch {
      setMessage('Network error. Try again.');
    } finally {
      setBusy('');
    }
  }

  return <div className="roadmap-list">{message && <div className="notice dashboard-action-message">{message}</div>}{items.length ? items.map((course) => {
    const categories = [...new Set(course.topics.map((topic) => topic.categoryName))];
    const completed = course.topics.filter((topic) => topic.progress === 100).length;
    return <section className="surface card roadmap-course" key={course.id}><div className="roadmap-course-head"><div><h2>{course.title}</h2><p>{completed} of {course.topics.length} topics complete</p></div><span className="roadmap-progress">{course.topics.length ? Math.round(completed / course.topics.length * 100) : 0}%</span></div>{course.description ? <p className="roadmap-course-description">{course.description}</p> : null}{course.content ? <details className="roadmap-course-details"><summary>Roadmap details</summary><div className="roadmap-course-content">{course.content}</div></details> : null}<div className="progress roadmap-progress-bar"><span style={{ width: `${course.topics.length ? completed / course.topics.length * 100 : 0}%` }} /></div><div className="roadmap-categories">{categories.map((category) => <div className="roadmap-category" key={category}><div className="roadmap-category-head"><strong>{category}</strong><small>{course.topics.filter((topic) => topic.categoryName === category).length} topics</small></div><div className="roadmap-topic-list">{course.topics.filter((topic) => topic.categoryName === category).map((topic) => <div className="roadmap-topic" key={topic.id}><span className={`roadmap-check ${topic.progress === 100 ? 'done' : ''}`}>{topic.progress === 100 ? <Check size={13} /> : <Circle size={10} />}</span><Link href={`/dashboard/notes?topic=${encodeURIComponent(topic.slug)}`}><strong>{topic.title}</strong><small>{topic.progress}% complete · {topic.summary || 'Open topic'}</small></Link>{topic.progress === 100 ? null : <button type="button" className="roadmap-complete" onClick={() => complete(topic.id)} disabled={busy === topic.id}>{busy === topic.id ? 'Saving...' : 'Mark complete'}</button>}<ChevronRight size={14} className="roadmap-arrow" /></div>)}</div></div>)}</div></section>;
  }) : <div className="surface empty">Enroll in a course to build your learning roadmap.</div>}</div>;
}
