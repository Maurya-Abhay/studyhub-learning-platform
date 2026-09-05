'use client';

import { Route, ArrowRight } from 'lucide-react';
import { useState } from 'react';

type ExploreRoadmap = { id: string; title: string; slug: string; description: string; categories: string[]; topicCount: number };

export function RoadmapExplorer({ roadmaps }: { roadmaps: ExploreRoadmap[] }) {
  const [busyId, setBusyId] = useState('');
  const [startedIds, setStartedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  async function start(courseId: string) {
    setBusyId(courseId);
    setMessage('');
    try {
      const response = await fetch('/api/enrollments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ courseId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to start this roadmap.');
      setStartedIds((current) => [...current, courseId]);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start this roadmap.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="roadmap-explore-grid">
      {roadmaps.map((roadmap) => (
        <div className="surface card roadmap-explore-card" key={roadmap.id}>
          <div className="eyebrow"><Route size={13} /> Roadmap</div>
          <h3>{roadmap.title}</h3>
          <p className="small muted">{roadmap.description || 'A structured path across the categories below.'}</p>
          <div className="roadmap-explore-chips">
            {roadmap.categories.map((category) => <span className="chip" key={category}>{category}</span>)}
          </div>
          <div className="roadmap-explore-footer">
            <small className="muted">{roadmap.topicCount} topics</small>
            <button type="button" className="btn primary small" onClick={() => start(roadmap.id)} disabled={busyId === roadmap.id || startedIds.includes(roadmap.id)}>
              {busyId === roadmap.id ? 'Starting...' : startedIds.includes(roadmap.id) ? 'Started' : 'Start roadmap'} <ArrowRight size={13} />
            </button>
          </div>
        </div>
      ))}
      {message && <div className="notice" style={{ gridColumn: '1 / -1' }}>{message}</div>}
    </div>
  );
}
