'use client';

import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

type SyllabusTopic = { id: string; title: string; summary: string; estimated_minutes: number };
type SyllabusGroup = { name: string; topics: SyllabusTopic[] };

export function CourseSyllabus({ groups }: { groups: SyllabusGroup[] }) {
  const [expanded, setExpanded] = useState('');
  return <div className="course-category-list">
    {groups.map((group) => {
      const open = expanded === group.name;
      return <section className={`course-category ${open ? 'is-open' : ''}`} key={group.name}>
        <button type="button" className="course-category-head" onClick={() => setExpanded(open ? '' : group.name)} aria-expanded={open}>
          <span><strong>{group.name}</strong><small>{group.topics.length} topics</small></span>
          <span className="course-category-explore">{open ? 'Hide topics' : 'Explore'} <ChevronRight size={14} /></span>
        </button>
        {open ? <div className="course-topic-preview-list">{group.topics.map((topic, index) => <div className="course-topic-row course-topic-preview" key={topic.id}><span className="course-topic-index">{String(index + 1).padStart(2, '0')}</span><span className="course-topic-copy"><strong>{topic.title}</strong><small>{topic.summary || 'Course topic preview.'}</small></span><span className="course-topic-meta"><span className="chip">{topic.estimated_minutes} min</span></span></div>)}</div> : null}
      </section>;
    })}
  </div>;
}
