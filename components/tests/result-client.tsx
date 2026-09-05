'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { Award, CheckCircle2, LayoutDashboard } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

type Result = { score: number; passed: boolean; title: string; passing: number; certificateCode: string | null };

function ResultInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const attemptId = search.get('attemptId') || '';
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!attemptId || !params?.id) { router.replace('/dashboard/tests'); return; }
    fetch(`/api/tests/result?id=${encodeURIComponent(params.id)}&attemptId=${encodeURIComponent(attemptId)}`, { cache: 'no-store' })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Unable to load result.'); setResult(d); })
      .catch(e => setMessage(e instanceof Error ? e.message : 'Unable to load result.'));
  }, [attemptId, params?.id, router]);
  async function issueCertificate() {
    setBusy(true); setMessage('');
    const response = await fetch('/api/certificates', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ attemptId }) });
    const data = await response.json();
    if (!response.ok) setMessage(data.error || 'Unable to issue certificate.');
    else setResult(current => current ? { ...current, certificateCode: data.certificateCode } : current);
    setBusy(false);
  }
  if (!result) return <main className="auth-wrap"><div className="surface auth-card"><div className="eyebrow">Assessment result</div><h1 className="title">Loading result…</h1>{message && <div className="notice" style={{marginTop:14}}>{message}</div>}</div></main>;
  return <main className="auth-wrap"><div className="surface auth-card"><div className="eyebrow"><CheckCircle2 size={13}/> Assessment result</div><h1 className="title">{result.passed ? 'Passed' : 'Needs more practice'}</h1><p className="subtitle">{result.title}</p><div className="stat" style={{marginTop:16}}><div className="stat-num">{result.score}%</div><div className="stat-label">Passing score {result.passing}%</div></div>{result.passed ? <div className="notice" style={{marginTop:14}}>Your assessment result is saved. Certificate eligibility is checked against the course settings.</div> : <div className="notice" style={{marginTop:14}}>Review the missed topics and try again when your next attempt becomes available.</div>}{message && <div className="notice" style={{marginTop:12}}>{message}</div>}<div className="hero-actions">{result.certificateCode ? <Link className="btn primary" href={`/study/certificates/${result.certificateCode}`}><Award size={15}/> View certificate</Link> : result.passed ? <button className="btn primary" onClick={issueCertificate} disabled={busy}><Award size={15}/> {busy ? 'Issuing…' : 'Issue certificate'}</button> : null}<Link className="btn secondary" href="/dashboard/tests"><LayoutDashboard size={14}/> Back to tests</Link><Link className="btn secondary" href="/dashboard">Dashboard</Link></div></div></main>;
}

export default function ResultClient() { return <Suspense fallback={<main className="auth-wrap"><div className="surface auth-card"><h1 className="title">Loading result…</h1></div></main>}><ResultInner /></Suspense>; }
