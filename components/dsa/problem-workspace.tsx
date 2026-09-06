'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Lightbulb, Maximize2, Minimize2, Play, Send, X } from 'lucide-react';
import type { DsaProblem } from '@/types';
import { useTheme } from '@/components/ui/theme-provider';

type NavigationProblem = { id: string; topicId?: string; title: string; slug: string; difficulty: string };
type DsaTopic = { id: string; name: string; slug: string };

export function ProblemWorkspace({ problem, topics = [], navigationProblems = [] }: { problem: DsaProblem; topics?: DsaTopic[]; navigationProblems?: NavigationProblem[] }) {
  const { theme } = useTheme();
  const [code, setCode] = useState(problem.starterCode);
  const [output, setOutput] = useState('No run yet.');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  useEffect(() => { const handleFullscreenChange = () => setFocusMode(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange', handleFullscreenChange); return () => document.removeEventListener('fullscreenchange', handleFullscreenChange); }, []);
  const outputState = status.toLowerCase().includes('accepted') || status.toLowerCase() === 'completed' ? 'success' : status.toLowerCase().includes('rejected') || status.toLowerCase().includes('error') || status.toLowerCase().includes('failed') ? 'error' : 'idle';

  async function execute(action: 'run' | 'submit') {
    setBusy(true); setStatus('');
    try {
      const response = await fetch('/api/dsa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, problemId: problem.id, source: code }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to execute code.');
      if (action === 'run') {
        setOutput(data.output || '(no stdout)');
        setStatus(data.status || 'Completed');
      } else {
        setOutput(`Passed ${data.passed}/${data.total} test cases.`);
        setStatus(data.accepted ? 'Accepted' : 'Rejected');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Code runner unavailable.');
    } finally { setBusy(false); }
  }
  async function toggleFocusMode() {
    if (focusMode) { if (document.fullscreenElement) await document.exitFullscreen(); else setFocusMode(false); return; }
    try { await document.documentElement.requestFullscreen(); } catch { setFocusMode(true); }
  }

  const topicGroups = topics.map((topic) => ({ topic, problems: navigationProblems.filter((item) => item.topicId === topic.id) })).filter((group) => group.problems.length);
  const ungrouped = navigationProblems.filter((item) => !topics.some((topic) => topic.id === item.topicId));

  return <div className={`problem-workspace ${focusMode ? 'dsa-focus-mode' : ''}`}>
    {focusMode ? <aside className="dsa-smart-sidebar">
      <div className="dsa-smart-sidebar-head"><div><span className="eyebrow">Smart learning</span><strong>DSA problems</strong></div>{focusMode ? <button type="button" className="icon-btn" onClick={toggleFocusMode} aria-label="Exit full screen"><X size={16} /></button> : null}</div>
      <div className="dsa-smart-sidebar-list">{topicGroups.map(({ topic, problems }) => <details key={topic.id} open={problems.some((item) => item.slug === problem.slug)}><summary><span>{topic.name}</span><small>{problems.length}</small><ChevronRight size={14} /></summary><div>{problems.map((item) => <Link className={item.slug === problem.slug ? 'active' : ''} href={`/dashboard/dsa?problem=${encodeURIComponent(item.slug)}`} key={item.id}><span>{item.title}</span><em className={`pill ${item.difficulty.toLowerCase()}`}>{item.difficulty}</em></Link>)}</div></details>)}{ungrouped.length ? <details open><summary><span>Other problems</span><small>{ungrouped.length}</small><ChevronRight size={14} /></summary><div>{ungrouped.map((item) => <Link className={item.slug === problem.slug ? 'active' : ''} href={`/dashboard/dsa?problem=${encodeURIComponent(item.slug)}`} key={item.id}>{item.title}</Link>)}</div></details> : null}</div>
    </aside> : null}
    <div className="surface problem-panel">
      <div className="meta-row"><span className={`pill ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>{problem.pattern && <span className="chip active">{problem.pattern}</span>}</div>
      <h1 className="dsa-problem-title">{problem.title}</h1>
      <p className="dsa-problem-summary">{problem.summary}</p>
      <section className="section-block"><h2>Problem</h2><p>{problem.problem}</p>{problem.examples&&<pre className="notice" style={{whiteSpace:'pre-wrap'}}>{problem.examples}</pre>}{problem.constraints&&<><h3>Constraints</h3><p>{problem.constraints}</p></>}</section>
      <section className="section-block"><h2>How to solve</h2><div className="callout"><strong>Hint:</strong> {problem.hint || 'Start by identifying the invariant and the information each step needs.'}</div><h3>Brute force</h3><p>{problem.bruteForce}</p><h3>Optimized approach</h3><p>{problem.optimized}</p><div className="meta-row"><span className="chip">Time: {problem.timeComplexity}</span><span className="chip">Space: {problem.spaceComplexity}</span></div></section>
      {problem.solution && <details className="section-block dsa-solution-section"><summary className="dsa-solution-summary"><span><strong>Solution</strong><small>Readable reference implementation for this problem.</small></span><span className="dsa-solution-meta"><span className="chip active">Java</span><ChevronDown size={16} /></span></summary><pre className="dsa-solution-code"><code>{problem.solution}</code></pre></details>}
      <section className="section-block"><h2>Test cases</h2><pre className="notice" style={{whiteSpace:'pre-wrap'}}>{problem.testCases}</pre></section>
    </div>
    <div className="surface problem-panel editor-panel">
      <div className="dsa-editor-head"><div><div className="eyebrow">Java editor</div><h2>Solve the problem</h2></div><div className="topic-actions"><button type="button" className="btn secondary small" onClick={toggleFocusMode} aria-label={focusMode ? 'Exit full screen' : 'Open full screen'}>{focusMode ? <Minimize2 size={13}/> : <Maximize2 size={13}/>}<span>{focusMode ? 'Exit' : 'Focus'}</span></button><button type="button" className="btn secondary small" onClick={()=>setCode(problem.starterCode)} disabled={busy}><Lightbulb size={13}/> Reset</button><button type="button" className="btn secondary small" onClick={()=>execute('run')} disabled={busy}><Play size={13}/>{busy?'Working':'Run Code'}</button><button type="button" className="btn primary small" onClick={()=>execute('submit')} disabled={busy}><Send size={13}/>{busy?'Checking':'Submit'}</button></div></div>
      <div className="editor-shell"><Editor theme={theme === 'dark' ? 'vs-dark' : 'light'} language="java" value={code} onChange={(value)=>setCode(value ?? '')} options={{fontSize:13,minimap:{enabled:false},padding:{top:14},wordWrap:'on',scrollBeyondLastLine:false}} height="540px"/></div>
      <section className={`test-output ${outputState}`} aria-live="polite">
        <div className="test-output-head">
          <div className="test-output-label"><span className="test-output-dot" /><span>Execution output</span></div>
          {status && <span className="test-output-status">{outputState === 'success' ? <CheckCircle2 size={13} /> : outputState === 'error' ? <AlertCircle size={13} /> : null}{status}</span>}
        </div>
        <pre className="test-output-body">{output}</pre>
      </section>
      <div className="notice" style={{marginTop:12}}><CheckCircle2 size={14}/> Submissions are stored against your account. Final acceptance is based on configured test cases.</div>
    </div>
  </div>;
}
