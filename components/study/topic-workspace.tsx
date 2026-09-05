'use client';

import Link from 'next/link';
import { Check, ChevronLeft, ChevronRight, Copy, Play, StickyNote } from 'lucide-react';
import { useState } from 'react';
import type { Category, Topic } from '@/types';

type Props = { topic: Topic; category?: Category; prev?: Topic; next?: Topic; initialProgress?: number; initialNote?: string };

export function TopicWorkspace({ topic, category, prev, next, initialProgress = 0, initialNote = '' }: Props) {
  const [progress, setProgress] = useState(initialProgress);
  const [message, setMessage] = useState('');
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState(topic.output ?? 'No output yet.');
  const [note, setNote] = useState(initialNote);
  const [notesOpen, setNotesOpen] = useState(Boolean(initialNote));

  async function complete() {
    const response = await fetch('/api/progress', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topicId: topic.id, progress: 100 }) });
    const data = await response.json();
    setMessage(response.ok ? 'Topic marked complete.' : data.error || 'Sign in to save progress.');
    if (response.ok) setProgress(data.progress ?? 100);
  }
  async function runCode() {
    if (!topic.codeExample) return;
    setRunning(true); setMessage('');
    try { const response = await fetch('/api/code', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: topic.codeExample, stdin: '', language: topic.codeLanguage ?? 'javascript' }) }); const data = await response.json(); setOutput(data.output || data.error || 'No output returned.'); }
    catch { setOutput('Code runner is unavailable right now.'); } finally { setRunning(false); }
  }
  async function copyCode() { if (!topic.codeExample) return; await navigator.clipboard.writeText(topic.codeExample); setMessage('Code copied.'); }
  async function saveNote() { const response = await fetch('/api/notes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topicId: topic.id, content: note }) }); const data = await response.json(); setMessage(response.ok ? 'Note saved.' : data.error || 'Unable to save note.'); }
  const anchors = [['concept','Concept',Boolean(topic.concept)],['explanation','Simple explanation',Boolean(topic.explanation)],['mental-model','Mental model',Boolean(topic.mentalModel)],['example','Real example',Boolean(topic.realExample)],['code','Code',Boolean(topic.codeExample)],['mistakes','Common mistakes',Boolean(topic.commonMistakes?.length)],['practice','Practice task',Boolean(topic.practiceTask)],['questions','Interview questions',Boolean(topic.interviewQuestions?.length)],['notes','Notes',true]] as const;
  const hasLearningContent = anchors.some(([id, , present]) => id !== 'notes' && present);
  return <div className="layout-topic">
    <article className="surface topic-main">
      <div className="topic-head"><div><div className="meta-row"><span className="chip active">{topic.difficulty}</span><span className="chip">{topic.estimatedMinutes} min</span><span className="chip">{progress}% complete</span></div><h1 className="topic-title">{topic.title}</h1><p className="topic-intro">{topic.summary}</p></div><div className="topic-actions"><button className="btn primary small" onClick={complete}><Check size={13}/> Mark complete</button></div></div>
      <div className="topic-progress-bar"><span style={{ width: `${progress}%` }}/></div><div className="topic-progress-steps" aria-label="Topic progress">{[25,50,75,100].map(step => <button type="button" key={step} className={`progress-step ${progress >= step ? 'done' : ''}`} onClick={async () => { if (step === progress) return; const response = await fetch('/api/progress',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({topicId:topic.id,progress:step})}); const data = await response.json(); if (response.ok) { setProgress(data.progress); setMessage(step === 100 ? 'Topic marked complete.' : `Progress saved at ${data.progress}%.`); } else setMessage(data.error || 'Sign in to save progress.'); }}>{step}%</button>)}</div>
      <div className="topic-anchor-row">{anchors.filter(([, , present])=>present).map(([id,label])=><a href={`#${id}`} key={id}>{label}</a>)}</div>
      {!hasLearningContent && <div className="topic-empty"><strong>Content is being prepared</strong><p>This topic has its title and settings, but the learning material has not been added yet.</p></div>}
      {topic.concept && <section id="concept" className="section-block"><h2>Concept</h2><p>{topic.concept}</p></section>}
      {topic.explanation && <section id="explanation" className="section-block"><h2>Simple explanation</h2><p>{topic.explanation}</p></section>}
      {topic.mentalModel && <section id="mental-model" className="section-block"><h2>Visual mental model</h2><div className="callout">{topic.mentalModel}</div></section>}
      {topic.realExample && <section id="example" className="section-block"><h2>Real example</h2><p>{topic.realExample}</p></section>}
      {topic.codeExample && <section id="code" className="section-block"><div className="section-head"><div><h2>Code example</h2><p className="small muted">Code appears only because this topic includes a runnable example.</p></div><div className="topic-actions"><button className="btn secondary small" onClick={copyCode}><Copy size={13}/> Copy</button><button className="btn primary small" onClick={runCode} disabled={running}><Play size={13}/>{running?'Running':'Run Code'}</button></div></div><div className="codebox"><div className="code-head"><span>{topic.codeLanguage || 'code'}</span></div><pre className="code-pre">{topic.codeExample}</pre></div><div className="test-output"><strong>Output</strong>{'\n'}{output}</div></section>}
      {topic.commonMistakes?.length ? <section id="mistakes" className="section-block"><h2>Common mistakes</h2><ul className="topic-list">{topic.commonMistakes.map(m => <li key={m}>{m}</li>)}</ul></section> : null}
      {topic.practiceTask && <section id="practice" className="section-block"><h2>Practice task</h2><div className="callout">{topic.practiceTask}</div></section>}
      {topic.interviewQuestions?.length ? <section id="questions" className="section-block"><h2>Interview questions</h2><ol className="topic-list">{topic.interviewQuestions.map(q => <li key={q}>{q}</li>)}</ol></section> : null}
      <section id="notes" className={`section-block topic-notes ${notesOpen ? 'is-open' : ''}`}><button type="button" className="topic-notes-toggle" onClick={() => setNotesOpen(value => !value)} aria-expanded={notesOpen}><span className="topic-notes-icon"><StickyNote size={16}/></span><span><strong>Notes</strong><small>{note ? 'Your saved reminder' : 'Add a quick reminder for this topic'}</small></span><ChevronRight size={16}/></button>{notesOpen ? <div className="topic-notes-editor"><textarea className="note-editor" value={note} onChange={e=>setNote(e.target.value)} placeholder="Write a quick revision note..."/><div className="form-actions"><button className="btn primary small" onClick={saveNote}>Save note</button></div></div> : note ? <p className="topic-notes-preview">{note}</p> : null}</section>
      {message && <div className="notice" style={{marginTop:12}}>{message}</div>}
      <div className="bottom-nav">{prev?<Link className="btn secondary small" href={`/study/topic/${prev.slug}`}><ChevronLeft size={14}/>{prev.title}</Link>:<span/>}{next?<Link className="btn secondary small" href={`/study/topic/${next.slug}`}>{next.title}<ChevronRight size={14}/></Link>:<span/>}</div>
    </article>
    <aside className="side"><div className="surface card"><div className="eyebrow">Topic details</div><div className="side-stat">Progress<strong>{progress}%</strong></div><div className="side-stat">Difficulty<strong>{topic.difficulty}</strong></div><div className="side-stat">Estimated time<strong>{topic.estimatedMinutes} min</strong></div><div className="side-stat">Sections<strong>{anchors.filter(([, ,p])=>p).length}</strong></div></div></aside>
  </div>;
}
