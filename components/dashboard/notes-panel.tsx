'use client';

import { Maximize2, Minimize2, Save } from 'lucide-react';
import { useState } from 'react';

type Note = {
  id: string;
  content: string;
  updatedAt: string;
  topicTitle: string;
  topicSlug?: string;
  topicId?: string;
};

export function NotesPanel({ notes }: { notes: Note[] }) {
  const [selectedId, setSelectedId] = useState(notes[0]?.id ?? '');
  const [expanded, setExpanded] = useState(true);
  const [content, setContent] = useState(notes[0]?.content ?? '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = notes.find((note) => note.id === selectedId) ?? notes[0];

  function selectNote(note: Note) {
    setSelectedId(note.id);
    setContent(note.content);
    setExpanded(true);
    setMessage('');
  }

  async function saveNote() {
    if (!selected || !selected.topicId) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topicId: selected.topicId, content }),
      });
      const data = await response.json();
      setMessage(response.ok ? 'Note saved.' : data.error || 'Unable to save note.');
    } catch {
      setMessage('Network error. Try saving again.');
    } finally {
      setSaving(false);
    }
  }

  if (!notes.length) return <div className="empty">Saved notes will appear here when you add them from a topic.</div>;

  return <div className="notes-reader">
    <aside className="notes-reader-nav" aria-label="Saved notes">
      <div className="notes-reader-nav-head"><span className="eyebrow">Notes</span><strong>{notes.length}</strong></div>
      <div className="notes-reader-list">
        {notes.map((note) => <button type="button" key={note.id} className={`notes-reader-item ${note.id === selected?.id ? 'active' : ''}`} onClick={() => selectNote(note)}>
          <span>{note.topicTitle}</span><small>{new Date(note.updatedAt).toLocaleDateString()}</small>
        </button>)}
      </div>
    </aside>
    {selected ? <section className={`notes-reader-content ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="notes-reader-head">
        <div><div className="eyebrow">Note</div><h2>{selected.topicTitle}</h2><p className="small muted">Updated {new Date(selected.updatedAt).toLocaleDateString()}</p></div>
        <div className="notes-reader-actions">
          <button type="button" className="icon-btn" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? 'Minimize note' : 'Maximize note'} title={expanded ? 'Minimize note' : 'Maximize note'}>{expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
        </div>
      </div>
      {expanded ? <><textarea className="note-editor notes-reader-editor" value={content} onChange={(event) => setContent(event.target.value)} aria-label={`Edit note for ${selected.topicTitle}`} /><div className="notes-reader-footer"><button type="button" className="btn primary small" onClick={saveNote} disabled={saving}><Save size={13} /> {saving ? 'Saving...' : 'Save note'}</button>{message && <span className="small muted">{message}</span>}</div></> : <p className="notes-reader-preview">{content || 'This note is empty.'}</p>}
    </section> : null}
  </div>;
}