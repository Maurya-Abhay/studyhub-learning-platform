'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Eye, Search, ShieldCheck, ShieldOff } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

type Certificate = { certificate_code: string; score: number; issued_at: string; revoked_at: string | null; profiles: { name: string | null } | { name: string | null }[] | null; courses: { title: string | null } | { title: string | null }[] | null };
function one<T>(value: T | T[] | null) { return Array.isArray(value) ? value[0] : value; }

export default function Page() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  async function load() { const response = await fetch('/api/admin/certificates'); const data = await response.json(); if (response.ok) setItems(data.certificates ?? []); else setError(data.error ?? 'Unable to load certificates.'); }
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => items.filter(item => `${one(item.profiles)?.name ?? ''} ${one(item.courses)?.title ?? ''} ${item.certificate_code}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  async function toggle(item: Certificate) { setBusy(item.certificate_code); const response = await fetch('/api/admin/certificates', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ certificateCode: item.certificate_code, revoked: !item.revoked_at }) }); const data = await response.json(); if (response.ok) setItems(current => current.map(x => x.certificate_code === item.certificate_code ? { ...x, revoked_at: data.certificate.revoked_at } : x)); else setError(data.error ?? 'Unable to update certificate.'); setBusy(''); }
   return <DashboardShell admin><div className="eyebrow">Admin · Certificates</div><h1 className="title">Certificates</h1><p className="subtitle">Review, verify, preview and revoke learner certificates.</p><div className="surface card" style={{ marginTop: 18 }}><div className="search"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search learner, course or certificate code..."/></div>{error && <div className="notice" style={{marginTop:12}}>{error}</div>}<div style={{marginTop:12}}>{filtered.length ? filtered.map(item => { const profile = one(item.profiles); const course = one(item.courses); return <div className="list-row" key={item.certificate_code}><div><strong>{course?.title || 'Course'}</strong><div className="small muted">{profile?.name || 'Learner'} · {item.score}% · {new Date(item.issued_at).toLocaleDateString()} · {item.certificate_code}</div></div><div style={{display:'flex',gap:7,alignItems:'center'}}><span className={`chip ${item.revoked_at ? '' : 'active'}`}>{item.revoked_at ? 'Revoked' : 'Valid'}</span><Link className="btn secondary small" href={`/admin/certificates/${item.certificate_code}`}><Eye size={14}/> Preview</Link><button className="btn secondary small" onClick={() => toggle(item)} disabled={busy === item.certificate_code}>{item.revoked_at ? <><ShieldCheck size={14}/> Restore</> : <><ShieldOff size={14}/> Revoke</>}</button></div></div>; }) : <div className="empty">No certificates match your search.</div>}</div></div></DashboardShell>;
}
