'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BrainCircuit, Check, FilePlus2, Layers3, Sparkles, Wand2 } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

type Generated = Record<string, unknown>;
type Course = { id: string; title: string };
type Category = { id: string; name: string };
type Topic = { id: string; title: string };

const defaultInstruction = 'Create a beginner-friendly draft with a clear concept, simple explanation, mental model, practical example, common mistakes, practice task and interview questions.';

export default function AiPage() {
  const [kind, setKind] = useState('topic');
  const [title, setTitle] = useState('HTML Forms');
  const [instruction, setInstruction] = useState(defaultInstruction);
  const [categoryId, setCategoryId] = useState('');
  const [quizTopicId, setQuizTopicId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [testCourseId, setTestCourseId] = useState('');
  const [result, setResult] = useState<Generated | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const preview = useMemo(() => result ? JSON.stringify(result, null, 2) : '', [result]);
  const modeHint = kind === 'topic-outline' ? 'AI will create a complete roadmap for the selected category.' : kind === 'topic' ? 'AI will write one complete lesson for the selected category.' : kind === 'quiz' ? 'AI will create questions for the selected topic.' : kind === 'test' ? 'AI will create questions and assessment rules for the selected course.' : 'AI will create a coding problem with a solution and test cases.';

  useEffect(() => {
    Promise.all([fetch('/api/admin/categories').then((response) => response.json()), fetch('/api/admin/content?kind=topics').then((response) => response.json()), fetch('/api/admin/content?kind=tests').then((response) => response.json())])
      .then(([categoryData, topicData, testData]) => { setCategories(categoryData.categories ?? []); setTopics((topicData.items ?? []).map((item: { id: string; title: string }) => ({ id: item.id, title: item.title }))); setCourses((testData.parents ?? []).map((item: { id: string; name?: string; title?: string }) => ({ id: item.id, title: item.name ?? item.title ?? 'Course' }))); })
      .catch(() => { setCategories([]); setTopics([]); });
  }, []);

  async function generate() {
    setBusy(true);
    setMessage('');
    setResult(null);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, title, instruction }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI generation failed.');
      setResult(data.content);
      setMessage('Draft generated. Review it before saving.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'AI service unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function improve() {
    const nextInstruction = `${instruction}\nImprove the current draft: make it clearer, more accurate, and more useful without changing the topic.`;
    setInstruction(nextInstruction);
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, title, instruction: nextInstruction }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI improvement failed.');
      setResult(data.content);
      setMessage('Improved draft generated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'AI service unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!result) return;
    const response = await fetch('/api/ai/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, title, instruction, output: result }) });
    const data = await response.json();
    setMessage(response.ok ? `Review draft saved: ${data.id}` : data.error || 'Unable to save draft.');
  }

  async function saveTopic() {
    if (!result) return;
    if (!categoryId) { setMessage('Choose a category before saving this as a topic.'); return; }
    const text = (key: string) => typeof result[key] === 'string' ? result[key] as string : '';
    const list = (key: string) => Array.isArray(result[key]) ? result[key] : [];
    const response = await fetch('/api/admin/content?kind=topics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: text('title') || title, description: text('summary'), categoryId, published: false, details: { summary: text('summary'), concept: text('concept'), explanation: text('explanation'), mental_model: text('mentalModel') || null, real_example: text('realExample') || null, code_example: text('codeExample') || null, code_language: text('codeLanguage') || null, output: text('output') || null, common_mistakes: list('commonMistakes'), practice_task: text('practiceTask') || null, interview_questions: list('interviewQuestions') } }) });
    const data = await response.json();
    setMessage(response.ok ? 'Topic saved as an unpublished draft. Review it in Topics.' : data.error || 'Unable to save topic.');
  }

  async function saveGenerated() {
    if (!result) return;
    const text = (key: string) => typeof result[key] === 'string' ? result[key] as string : '';
    const list = (key: string) => Array.isArray(result[key]) ? result[key] : [];
    if (kind === 'topic-outline') {
      if (!categoryId || !Array.isArray(result.topics)) { setMessage('Choose a category and generate a topic outline first.'); return; }
      const responses = await Promise.all((result.topics as Array<Record<string, unknown>>).map((item) => fetch('/api/admin/content?kind=topics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: String(item.title || 'Untitled topic'), description: String(item.summary || ''), categoryId, published: false, details: { summary: String(item.summary || ''), difficulty: String(item.difficulty || 'Beginner'), estimated_minutes: Number(item.estimatedMinutes) || 10 } }) })));
      const failed = responses.filter((response) => !response.ok).length;
      setMessage(failed ? `${responses.length - failed} topics saved, ${failed} failed. Open Topics to review.` : `${responses.length} topic drafts added to the category.`);
      return;
    }
    if (kind === 'dsa') {
      const response = await fetch('/api/admin/content?kind=dsa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: text('title') || title, description: text('summary'), published: false, details: { difficulty: text('difficulty') || 'Easy', pattern: text('pattern'), summary: text('summary'), problem: text('problem'), examples: text('examples'), constraints: text('constraints'), hint: text('hint'), brute_force: text('bruteForce'), optimized: text('optimized'), time_complexity: text('timeComplexity'), space_complexity: text('spaceComplexity'), starter_code: text('starterCode'), solution: text('solution'), test_cases: list('testCases') } }) });
      setMessage(response.ok ? 'DSA problem draft added to the database.' : 'Unable to save DSA draft.');
      return;
    }
    if (kind === 'quiz') {
      if (!quizTopicId || !Array.isArray(result.questions)) { setMessage('Choose a topic and generate quiz questions first.'); return; }
      const responses = await Promise.all((result.questions as Array<Record<string, unknown>>).map((question) => fetch('/api/admin/content?kind=questions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: String(question.prompt || 'Question'), description: String(question.explanation || ''), parentId: quizTopicId, published: false, details: { type: String(question.type || 'mcq'), options: Array.isArray(question.options) ? question.options : [], answer: question.answer ?? null, explanation: String(question.explanation || '') } }) })));
      setMessage(responses.every((response) => response.ok) ? `${responses.length} question drafts added.` : 'Some questions could not be saved.');
      return;
    }
    if (kind === 'test') {
      if (!testCourseId || !Array.isArray(result.questions)) { setMessage('Choose a course and generate test questions first.'); return; }
      const questionIds: string[] = [];
      for (const question of result.questions as Array<Record<string, unknown>>) {
        const response = await fetch('/api/admin/content?kind=questions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: String(question.prompt || 'Question'), description: String(question.explanation || ''), published: false, details: { type: String(question.type || 'mcq'), options: Array.isArray(question.options) ? question.options : [], answer: question.answer ?? null, explanation: String(question.explanation || '') } }) });
        const data = await response.json();
        if (response.ok && data.item?.id) questionIds.push(data.item.id);
      }
      const response = await fetch('/api/admin/content?kind=tests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: String(result.title || title), description: String(result.description || ''), parentId: testCourseId, published: false, questionIds, details: { duration_minutes: Number(result.durationMinutes) || 30, passing_score: Number(result.passingScore) || 70, unlock_days: Number(result.unlockDays) || 0, required_progress: Number(result.requiredProgress) || 100 } }) });
      setMessage(response.ok ? `Test draft saved with ${questionIds.length} questions.` : 'Unable to save test draft.');
    }
  }

  async function saveDetailedOutline() {
    if (!result || !categoryId || !Array.isArray(result.topics)) { setMessage('Choose a category and generate a topic outline first.'); return; }
    setBusy(true);
    setMessage('Generating detailed content for every topic...');
    let saved = 0;
    try {
      for (const item of result.topics as Array<Record<string, unknown>>) {
        const topicTitle = String(item.title || 'Untitled topic');
        const generation = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'topic', title: topicTitle, instruction: `Create a complete detailed lesson for ${topicTitle}. Include a clear concept, explanation, mental model, practical example, code example when useful, expected output, common mistakes, practice task, and interview questions.` }) });
        const generated = await generation.json();
        if (!generation.ok || !generated.content) continue;
        const content = generated.content as Record<string, unknown>;
        const text = (key: string) => typeof content[key] === 'string' ? content[key] as string : '';
        const list = (key: string) => Array.isArray(content[key]) ? content[key] : [];
        const savedResponse = await fetch('/api/admin/content?kind=topics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: text('title') || topicTitle, description: text('summary'), categoryId, published: false, details: { summary: text('summary'), concept: text('concept'), explanation: text('explanation'), mental_model: text('mentalModel') || null, real_example: text('realExample') || null, code_example: text('codeExample') || null, code_language: text('codeLanguage') || null, output: text('output') || null, common_mistakes: list('commonMistakes'), practice_task: text('practiceTask') || null, interview_questions: list('interviewQuestions') } }) });
        if (savedResponse.ok) saved += 1;
      }
      setMessage(`${saved} detailed topic drafts added to the selected category.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <div className="ai-page-heading"><div><div className="eyebrow"><Sparkles size={13} /> AI STUDY STUDIO</div><h1 className="title">Create learning content faster.</h1><p className="subtitle">Generate a structured draft, review the output, then send it into your live topic library.</p></div><span className="ai-status"><span /> Admin-only workspace</span></div>
      <div className="ai-layout ai-workspace">
        <section className="surface card ai-builder"><div className="ai-section-label">01 / Build a draft</div><h2 className="title" style={{ fontSize: 23 }}>Give the studio direction</h2><p className="small muted">{modeHint}</p><div className="ai-form-stack"><div className="field"><label>Generation type</label><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="topic-outline">All topics for category</option><option value="topic">Detailed topic</option><option value="quiz">Quiz questions</option><option value="test">Complete test</option><option value="dsa">DSA problem</option></select></div>{kind !== 'test' && <div className="field"><label>Category</label><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>}{kind === 'quiz' && <div className="field"><label>Quiz topic</label><select value={quizTopicId} onChange={(event) => setQuizTopicId(event.target.value)}><option value="">Choose topic</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></div>}{kind === 'test' && <div className="field"><label>Test course</label><select value={testCourseId} onChange={(event) => setTestCourseId(event.target.value)}><option value="">Choose course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></div>}<div className="field"><label>Title / subject</label><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. HTML Forms" /></div><div className="field"><label>Instruction</label><textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} /></div></div><div className="form-actions ai-builder-actions"><button type="button" className="btn secondary small" onClick={() => setKind('dsa')}><BrainCircuit size={13} /> DSA mode</button><button type="button" className="btn primary" onClick={generate} disabled={busy}><Wand2 size={14} />{busy ? 'Generating...' : 'Generate with AI'}</button></div></section>
        <section className="surface card ai-preview-panel"><div className="ai-section-label">02 / Review output</div><div className="ai-preview-heading"><div><h2 className="title" style={{ fontSize: 23 }}>Structured output</h2><p className="small muted">Nothing is published automatically.</p></div>{result && <span className="ai-ready"><Check size={13} /> Ready to review</span>}</div><pre className="ai-output">{preview || 'Your generated content will appear here as a structured JSON draft.'}</pre>{message && <div className="notice ai-message">{message}</div>}</section>
      </div>
      {result && <section className="surface card ai-publish-panel"><div><div className="ai-section-label">03 / Send it somewhere useful</div><h2 className="title" style={{ fontSize: 20 }}>Save this work</h2><p className="small muted">Review first, then add drafts to the selected category or topic.</p></div><div className="ai-publish-actions"><button className="btn secondary small" onClick={improve} disabled={busy}><Wand2 size={13} /> Improve</button><button className="btn secondary small" onClick={saveDraft}><FilePlus2 size={13} /> Save review draft</button>{kind === 'topic' && <button className="btn primary small" onClick={saveTopic}><ArrowRight size={13} /> Save topic draft</button>}{kind === 'topic-outline' && <><button className="btn secondary small" onClick={saveGenerated} disabled={busy}><Layers3 size={13} /> Save outline</button><button className="btn primary small" onClick={saveDetailedOutline} disabled={busy}><ArrowRight size={13} /> Generate & save detailed topics</button></>}{kind !== 'topic' && kind !== 'topic-outline' && <button className="btn primary small" onClick={saveGenerated}><Layers3 size={13} /> Add to database</button>}</div></section>}
    </DashboardShell>
  );
}
