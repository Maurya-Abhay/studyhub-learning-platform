'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { JsonBulkBox } from '@/components/admin/json-bulk-box';
import { AdminPagination, paginate } from '@/components/admin/admin-pagination';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Course = { id: string; title: string };
type Question = { id: string; prompt: string; categoryId: string | null; categoryName: string };
type Test = { id: string; title: string; course_id: string | null; duration_minutes: number; passing_score: number; unlock_days: number; required_progress: number; max_attempts: number; random_questions: boolean; random_options: boolean; published: boolean };

const example = JSON.stringify([{ title: 'HTML Final Test', courseId: 'COURSE_ID', durationMinutes: 30, passingScore: 70, unlockDays: 10, requiredProgress: 100, maxAttempts: 1, questionIds: [], published: false }], null, 2);

export function TestManager() {
  const confirm = useConfirm();
  const [items, setItems] = useState<Test[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [links, setLinks] = useState<Record<string, string[]>>({});
  const [mode, setMode] = useState<'bulk' | 'manual'>('manual');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ title: '', courseId: '', duration: '30', passing: '70', unlock: '0', progress: '100', attempts: '1', randomQuestions: true, randomOptions: true, questionIds: [] as string[], published: false });

  async function load() {
    const response = await fetch('/api/admin/content?kind=tests');
    const data = await response.json();
    if (response.ok) { setItems(data.items ?? []); setCourses(data.courses ?? []); setQuestions(data.questionOptions ?? []); setLinks(data.testQuestionIds ?? {}); }
    else setMessage(data.error || 'Unable to load tests.');
  }

  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const banks = useMemo(() => {
    const grouped = new Map<string, { name: string; questions: Question[] }>();
    for (const question of questions) {
      const key = question.categoryId ?? 'general';
      const bank = grouped.get(key) ?? { name: question.categoryName, questions: [] };
      bank.questions.push(question);
      grouped.set(key, bank);
    }
    return [...grouped.entries()];
  }, [questions]);

  function toggleBank(bankId: string) {
    setForm((current) => {
      const ids = questions.filter((question) => (question.categoryId ?? 'general') === bankId).map((question) => question.id);
      const selected = new Set(current.questionIds);
      const allSelected = ids.every((id) => selected.has(id));
      ids.forEach((id) => allSelected ? selected.delete(id) : selected.add(id));
      return { ...current, questionIds: [...selected] };
    });
  }

  function edit(item: Test) {
    setMode('manual'); setEditing(item.id);
    setForm({ title: item.title, courseId: item.course_id ?? '', duration: String(item.duration_minutes), passing: String(item.passing_score), unlock: String(item.unlock_days), progress: String(item.required_progress), attempts: String(item.max_attempts ?? 1), randomQuestions: item.random_questions !== false, randomOptions: item.random_options !== false, questionIds: links[item.id] ?? [], published: item.published });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch('/api/admin/content?kind=tests', { method: editing ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: editing || undefined, name: form.title, parentId: form.courseId, published: form.published, questionIds: form.questionIds, details: { courseId: form.courseId, duration_minutes: Number(form.duration) || 30, passing_score: Number(form.passing) || 70, unlock_days: Number(form.unlock) || 0, required_progress: Number(form.progress) || 100, max_attempts: Number(form.attempts) || 1, random_questions: form.randomQuestions, random_options: form.randomOptions } }) });
    const data = await response.json(); setMessage(response.ok ? 'Test saved.' : data.error || 'Unable to save.');
    if (response.ok) { setEditing(''); setForm({ title: '', courseId: '', duration: '30', passing: '70', unlock: '0', progress: '100', attempts: '1', randomQuestions: true, randomOptions: true, questionIds: [], published: false }); load(); }
  }

  async function remove(id: string) {
    if (!(await confirm({ title: 'Delete test?', message: 'This test will be permanently removed.', confirmLabel: 'Delete', danger: true }))) return;
    const response = await fetch(`/api/admin/content?kind=tests&id=${id}`, { method: 'DELETE' });
    if (response.ok) setItems((current) => current.filter((item) => item.id !== id));
  }

  function clearForm() { setEditing(''); setForm({ title: '', courseId: '', duration: '30', passing: '70', unlock: '0', progress: '100', attempts: '1', randomQuestions: true, randomOptions: true, questionIds: [], published: false }); }

  return <div>
    <div className="admin-mode-tabs"><button type="button" className={`btn ${mode === 'manual' ? 'primary' : 'secondary'} small`} onClick={() => setMode('manual')}>Test editor</button><button type="button" className={`btn ${mode === 'bulk' ? 'primary' : 'secondary'} small`} onClick={() => setMode('bulk')}>Bulk JSON</button></div>
    {mode === 'bulk' ? <div className="two-col"><JsonBulkBox endpoint="/api/admin/content?kind=tests" title="Import tests" description="Create test definitions in bulk. Add questionIds when you already have a question bank." example={example} onImported={load} /><TestList items={filtered} query={query} setQuery={setQuery} edit={edit} remove={remove} /></div> : <div className="two-col"><section className="surface card"><form className="form-grid" onSubmit={save}>
      <div className="field full"><label>Test name</label><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></div>
      <div className="field full"><label>Course</label><select value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })}><option value="">General test</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></div>
      <div className="field"><label>Duration</label><input type="number" min="1" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} /></div><div className="field"><label>Passing score %</label><input type="number" min="0" max="100" value={form.passing} onChange={(event) => setForm({ ...form, passing: event.target.value })} /></div><div className="field"><label>Unlock after days</label><input type="number" min="0" value={form.unlock} onChange={(event) => setForm({ ...form, unlock: event.target.value })} /></div><div className="field"><label>Required progress %</label><input type="number" min="0" max="100" value={form.progress} onChange={(event) => setForm({ ...form, progress: event.target.value })} /></div><div className="field"><label>Attempts allowed</label><input type="number" min="1" value={form.attempts} onChange={(event) => setForm({ ...form, attempts: event.target.value })} /></div><div className="field"><label>Visibility</label><select value={String(form.published)} onChange={(event) => setForm({ ...form, published: event.target.value === 'true' })}><option value="false">Draft</option><option value="true">Published</option></select></div><label className="toggle-row"><input type="checkbox" checked={form.randomQuestions} onChange={event => setForm({ ...form, randomQuestions: event.target.checked })}/><span><strong>Randomize question order</strong><small>Shuffle the assigned questions for each attempt.</small></span></label><label className="toggle-row"><input type="checkbox" checked={form.randomOptions} onChange={event => setForm({ ...form, randomOptions: event.target.checked })}/><span><strong>Randomize answer options</strong><small>Shuffle MCQ options without changing the stored answer value.</small></span></label>
      <div className="field full"><label>Question banks</label><div className="test-bank-grid">{banks.map(([id, bank]) => { const selected = bank.questions.every((question) => form.questionIds.includes(question.id)); return <button type="button" key={id} className={`test-bank-option ${selected ? 'selected' : ''}`} onClick={() => toggleBank(id)}><span><strong>{bank.name}</strong><small>{bank.questions.length} questions</small></span><b>{selected ? 'Selected' : 'Select'}</b></button>; })}</div><div className="test-question-total">Total questions selected: <strong>{form.questionIds.length}</strong></div></div>
      <div className="form-actions"><button type="button" className="btn secondary" onClick={clearForm}>Clear</button><button className="btn primary"><Plus size={14} />{editing ? 'Save changes' : 'Create test'}</button></div>
    </form>{message && <div className="notice" style={{ marginTop: 12 }}>{message}</div>}</section><TestList items={filtered} query={query} setQuery={setQuery} edit={edit} remove={remove} /></div>}
  </div>;
}

function TestList({ items, query, setQuery, edit, remove }: { items: Test[]; query: string; setQuery: (value: string) => void; edit: (item: Test) => void; remove: (id: string) => void }) { const [page, setPage] = useState(1); const pageSize = 10; const pageCount = Math.max(1, Math.ceil(items.length / pageSize)); useEffect(() => { setPage(1); }, [query]); useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]); const visible = paginate(items, page, pageSize); return <section className="surface card"><div className="search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tests..." /></div>{visible.length ? visible.map((item) => <div className="list-row" key={item.id}><div><strong>{item.title}</strong><div className="small muted">{item.duration_minutes} min · {item.passing_score}% pass · unlock {item.unlock_days}d</div></div><div className="topic-actions"><span className={`chip ${item.published ? 'active' : ''}`}>{item.published ? 'Published' : 'Draft'}</span><button className="icon-btn" onClick={() => edit(item)} aria-label="Edit test"><Pencil size={14} /></button><button className="icon-btn" onClick={() => remove(item.id)} aria-label="Delete test"><Trash2 size={14} /></button></div></div>) : <div className="empty">No tests found.</div>}<AdminPagination page={page} pageCount={pageCount} total={items.length} pageSize={pageSize} onPageChange={setPage} /></section>; }
