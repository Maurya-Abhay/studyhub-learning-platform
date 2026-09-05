'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, Sparkles, FileJson, ListChecks, Trash2 } from 'lucide-react';

type Roadmap = { id: string; title: string; slug: string; description: string; content?: string; published: boolean; categoryIds: string[]; topicIds: string[]; categories: Array<{ id: string; name: string }> };
type Category = { id: string; name: string; slug: string };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 120);
}

export function RoadmapManager() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [published, setPublished] = useState(true);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [jsonValue, setJsonValue] = useState('');

  const [aiOpen, setAiOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('Build a beginner-to-job-ready roadmap covering the core subjects for this goal, in the right learning order.');
  const [aiBusy, setAiBusy] = useState(false);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    setMessage('Loading roadmaps...');
    try {
      const [roadmapRes, categoryRes] = await Promise.all([fetch('/api/admin/roadmaps'), fetch('/api/admin/categories')]);
      const roadmapData = await roadmapRes.json();
      const categoryData = await categoryRes.json();
      if (!roadmapRes.ok) throw new Error(roadmapData.error || 'Unable to load roadmaps.');
      if (!categoryRes.ok) throw new Error(categoryData.error || 'Unable to load categories.');
      setRoadmaps(roadmapData.roadmaps ?? []);
      setCategories(categoryData.categories ?? []);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load roadmaps.');
    }
  }
  useEffect(() => { load(); }, []);

  function resetForm() {
    setSelectedId(''); setTitle(''); setSlug(''); setDescription(''); setContent(''); setPublished(true); setCategoryIds([]); setMessage(''); setJsonValue('');
  }

  function selectRoadmap(id: string) {
    setMessage('');
    if (!id) { resetForm(); return; }
    const roadmap = roadmaps.find((item) => item.id === id);
    if (!roadmap) return;
    setSelectedId(id);
    setTitle(roadmap.title);
    setSlug(roadmap.slug);
    setDescription(roadmap.description || '');
    setContent(roadmap.content || '');
    setPublished(roadmap.published);
    setCategoryIds(roadmap.categoryIds || []);
    setJsonValue(JSON.stringify({ id: roadmap.id, title: roadmap.title, description: roadmap.description, content: roadmap.content || '', published: roadmap.published, categories: roadmap.categories, categoryIds: roadmap.categoryIds, topicIds: roadmap.topicIds }, null, 2));
  }

  function toggleCategory(id: string) {
    setCategoryIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function generateWithAi() {
    if (!title.trim()) { setMessage('Add a roadmap title first, then generate with AI.'); return; }
    setAiBusy(true); setMessage('');
    try {
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'roadmap', title, instruction: aiInstruction }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI generation failed.');
      const draft = data.content as { title?: string; slug?: string; description?: string; categoryNames?: string[] };
      if (draft.description) setDescription(draft.description);
      if (draft.slug) setSlug(draft.slug);
      const matched = (draft.categoryNames ?? [])
        .map((name) => categories.find((category) => category.name.toLowerCase() === String(name).toLowerCase()))
        .filter((category): category is Category => Boolean(category))
        .map((category) => category.id);
      if (matched.length) setCategoryIds([...new Set(matched)]);
      setMessage(matched.length ? `Draft generated. Matched ${matched.length} existing categories — review and adjust the selection.` : 'Draft generated, but no existing categories matched by name. Pick categories manually below.');
      setAiOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'AI service unavailable. Check OPENROUTER_API_KEY.');
    } finally {
      setAiBusy(false);
    }
  }

  async function saveForm() {
    if (!title.trim()) { setMessage('Roadmap title is required.'); return; }
    setBusy(true); setMessage('');
    try {
      const payload = { id: selectedId || undefined, title: title.trim(), slug: slug.trim() || slugify(title), description: description.trim(), content, published, categoryIds };
      const response = await fetch('/api/admin/roadmaps', {
        method: selectedId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(selectedId ? payload : { records: [payload] }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save roadmap.');
      setMessage(selectedId ? 'Roadmap updated.' : 'Roadmap created.');
      await load();
      if (!selectedId) resetForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save roadmap.');
    } finally {
      setBusy(false);
    }
  }

  async function saveJson() {
    setBusy(true); setMessage('');
    try {
      const data = JSON.parse(jsonValue) as Record<string, unknown>;
      const response = await fetch('/api/admin/roadmaps', { method: selectedId ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(selectedId ? data : { records: [data] }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save roadmap.');
      setMessage(selectedId ? 'Roadmap updated.' : 'Roadmap created from pasted JSON.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Invalid roadmap JSON.');
    } finally {
      setBusy(false);
    }
  }

  const jsonPlaceholder = useMemo(() => JSON.stringify({ title: 'Frontend Developer Roadmap', description: 'HTML to React, in order.', categoryIds: [], topicIds: [], published: true }, null, 2), []);

  return (
    <div>
      <div className="roadmap-admin-editor surface card">
        <div className="field roadmap-picker">
          <label>Choose roadmap</label>
          <select value={selectedId} onChange={(event) => selectRoadmap(event.target.value)}>
            <option value="">{roadmaps.length ? '+ New roadmap' : 'No existing roadmaps — create one below'}</option>
            {roadmaps.map((roadmap) => <option value={roadmap.id} key={roadmap.id}>{roadmap.title}</option>)}
          </select>
          {message ? <p className="roadmap-status" role="status">{message}</p> : null}
        </div>

        <div className="admin-mode-tabs" style={{ marginTop: 14 }}>
          <button type="button" className={`btn ${mode === 'form' ? 'primary' : 'secondary'} small`} onClick={() => setMode('form')}><ListChecks size={13} /> Guided form</button>
          <button type="button" className={`btn ${mode === 'json' ? 'primary' : 'secondary'} small`} onClick={() => setMode('json')}><FileJson size={13} /> Paste JSON (any AI tool)</button>
        </div>

        {mode === 'form' ? (
          <div className="roadmap-admin-columns" style={{ marginTop: 16 }}>
            <div>
              <div className="form-grid">
                <div className="field full">
                  <label>Roadmap title</label>
                  <input value={title} onChange={(event) => { setTitle(event.target.value); if (!selectedId) setSlug(slugify(event.target.value)); }} placeholder="e.g. Frontend Developer Roadmap" />
                </div>
                <div className="field full">
                  <label>Slug</label>
                  <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="frontend-developer-roadmap" />
                </div>
                <div className="field full">
                  <label>Short description <small className="muted">(shown on cards)</small></label>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="What will a learner achieve by finishing this roadmap?" />
                </div>
                <div className="field full">
                  <label>Complete course details <small className="muted">(full explanation shown on the roadmap/course page — write as much as you need)</small></label>
                  <textarea className="roadmap-content-input" value={content} onChange={(event) => setContent(event.target.value)} rows={16} placeholder={'Explain the complete course in detail here:\n\n- What the learner will be able to do after finishing\n- Prerequisites\n- Week-by-week or category-by-category breakdown\n- Who this roadmap is for\n- Any other detail worth knowing before starting'} />
                </div>
                <div className="field full">
                  <label>Categories included in this roadmap, in order</label>
                  <div className="roadmap-category-picker">
                    {categories.length ? categories.map((category) => (
                      <label key={category.id} className={`roadmap-category-chip ${categoryIds.includes(category.id) ? 'checked' : ''}`}>
                        <input type="checkbox" checked={categoryIds.includes(category.id)} onChange={() => toggleCategory(category.id)} />
                        <span>{categoryIds.includes(category.id) ? categoryIds.indexOf(category.id) + 1 : ''} {category.name}</span>
                      </label>
                    )) : <p className="small muted">No categories yet — create categories first from Admin → Categories.</p>}
                  </div>
                  <p className="small muted" style={{ marginTop: 6 }}>Every published topic inside the selected categories is added automatically, in category order.</p>
                </div>
                <div className="toggle-row full">
                  <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} id="roadmap-published" />
                  <label htmlFor="roadmap-published"><strong>Published</strong><small>Visible to learners on the dashboard roadmap page</small></label>
                </div>
              </div>

              <div className="roadmap-admin-actions" style={{ marginTop: 14 }}>
                <button type="button" className="btn primary small" onClick={saveForm} disabled={busy}><Save size={13} /> {busy ? 'Saving...' : selectedId ? 'Update roadmap' : 'Create roadmap'}</button>
                <button type="button" className="btn secondary small" onClick={() => setAiOpen((value) => !value)}><Sparkles size={13} /> Generate with AI</button>
                {selectedId ? <button type="button" className="btn secondary small" onClick={resetForm}><Trash2 size={13} /> Clear / new</button> : null}
                {message && <span className="small muted">{message}</span>}
              </div>

              {aiOpen ? (
                <div className="surface card" style={{ marginTop: 12 }}>
                  <div className="eyebrow">AI draft</div>
                  <p className="small muted">Give the title above (e.g. &quot;Backend with Node.js Roadmap&quot;), describe the goal, and AI will draft a description and suggest matching categories.</p>
                  <textarea value={aiInstruction} onChange={(event) => setAiInstruction(event.target.value)} rows={3} style={{ marginTop: 8 }} />
                  <button type="button" className="btn primary small" style={{ marginTop: 8 }} onClick={generateWithAi} disabled={aiBusy}><Sparkles size={13} /> {aiBusy ? 'Generating...' : 'Generate draft'}</button>
                </div>
              ) : null}
            </div>

            <div className="roadmap-id-help">
              <div className="eyebrow">Existing roadmaps</div>
              <div className="roadmap-existing-list">
                {roadmaps.map((roadmap) => (
                  <button type="button" key={roadmap.id} onClick={() => selectRoadmap(roadmap.id)}>
                    <strong>{roadmap.title}</strong>
                    <small>{roadmap.categories.map((category) => category.name).join(' · ') || 'No categories'} · {roadmap.topicIds.length} topics {roadmap.published ? '' : '· draft'}</small>
                  </button>
                ))}
                {!roadmaps.length && <p className="small muted">No roadmaps yet — create your first one.</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="roadmap-admin-columns" style={{ marginTop: 16 }}>
            <div>
              <label className="roadmap-json-label">Roadmap JSON — paste output from ChatGPT, Claude, or any AI tool</label>
              <textarea className="json-editor roadmap-json-input" value={jsonValue} onChange={(event) => setJsonValue(event.target.value)} placeholder={jsonPlaceholder} spellCheck={false} />
              <div className="roadmap-admin-actions">
                <button type="button" className="btn primary small" onClick={saveJson} disabled={busy}><Save size={13} /> {busy ? 'Saving...' : selectedId ? 'Update roadmap' : 'Create roadmap'}</button>
                {message && <span className="small muted">{message}</span>}
              </div>
            </div>
            <div className="roadmap-id-help">
              <div className="eyebrow">How it works</div>
              <p>Paste a JSON object with <strong>title</strong>, <strong>description</strong>, <strong>categoryIds</strong> (or leave empty and set <strong>topicIds</strong> directly), and <strong>published</strong>.</p>
              <p>Switch to <strong>Guided form</strong> to pick categories by name instead of copying IDs.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
