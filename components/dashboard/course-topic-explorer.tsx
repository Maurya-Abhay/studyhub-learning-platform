'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

type Topic = { id: string; title: string; slug: string; summary: string; categoryName: string; progress: number };

export function CourseTopicExplorer({ topics }: { topics: Topic[] }) {
  const categories = [...new Set(topics.map((topic) => topic.categoryName))];
  const [expanded, setExpanded] = useState('');

  return <div className="dashboard-course-explorer">{categories.map((category) => {
    const categoryTopics = topics.filter((topic) => topic.categoryName === category);
    const isExpanded = expanded === category;
    return <div className={`dashboard-course-category ${isExpanded ? 'expanded' : ''}`} key={category}>
      <button type="button" className="dashboard-course-category-toggle" onClick={() => setExpanded(isExpanded ? '' : category)} aria-expanded={isExpanded}>
        <span><strong>{category}</strong><small>{categoryTopics.length} topics</small></span><span className="dashboard-course-category-action">{isExpanded ? 'Hide topics' : 'Explore'}<ChevronRight size={15} /></span>
      </button>
      {isExpanded ? <div className="dashboard-course-topic-list">{categoryTopics.map((topic) => <Link className="dashboard-course-topic" href={`/dashboard/notes?topic=${encodeURIComponent(topic.slug)}`} key={topic.id}><span><strong>{topic.title}</strong><small>{topic.progress}% complete · {topic.summary || 'Open topic'}</small></span><ChevronRight size={15} /></Link>)}</div> : null}
    </div>;
  })}</div>;
}
