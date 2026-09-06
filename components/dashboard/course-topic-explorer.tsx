'use client';

import Link from 'next/link';
import { ChevronRight, Play } from 'lucide-react';
import { useState } from 'react';

type Topic = { id: string; title: string; slug: string; summary: string; categoryName: string; progress: number };

export function CourseTopicExplorer({ topics, enrolled = false }: { topics: Topic[]; enrolled?: boolean }) {
  const categories = [...new Set(topics.map((topic) => topic.categoryName))];
  const [expanded, setExpanded] = useState('');
  const nextTopic = topics.find((topic) => topic.progress < 100) ?? topics[0];

  return <div className="dashboard-course-explorer">{enrolled && nextTopic ? <div className="smart-learning-start"><div><span className="eyebrow">Next lesson</span><strong>{nextTopic.title}</strong><small>{nextTopic.categoryName} · {nextTopic.progress}% complete</small></div><Link className="btn primary small" href={`/dashboard/notes?topic=${encodeURIComponent(nextTopic.slug)}`}><Play size={13} /> Start learning</Link></div> : null}{categories.map((category) => {
    const categoryTopics = topics.filter((topic) => topic.categoryName === category);
    const isExpanded = expanded === category;
    return <div className={`dashboard-course-category ${isExpanded ? 'expanded' : ''}`} key={category}>
      <button type="button" className="dashboard-course-category-toggle" onClick={() => setExpanded(isExpanded ? '' : category)} aria-expanded={isExpanded}>
        <span><strong>{category}</strong><small>{categoryTopics.length} topics</small></span><span className="dashboard-course-category-action">{isExpanded ? 'Hide topics' : 'Explore'}<ChevronRight size={15} /></span>
      </button>
      {isExpanded ? <div className="dashboard-course-topic-list">{categoryTopics.map((topic) => <Link className="dashboard-course-topic" href={`/dashboard/notes?topic=${encodeURIComponent(topic.slug)}`} key={topic.id}><span><strong>{topic.title}</strong><small>{enrolled ? `${topic.progress}% complete · ` : ''}{topic.summary || 'Open topic'}</small></span><ChevronRight size={15} /></Link>)}</div> : null}
    </div>;
  })}</div>;
}
