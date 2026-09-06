'use client';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useConfirm } from '@/components/ui/confirm-dialog';

export function EnrollButton({ courseId, topicSlug, redirectPath, courseTitle, terms }: { courseId: string; topicSlug?: string; redirectPath?: string; courseTitle?: string; terms?: string[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function enroll() {
    if (busy) return;
    if (terms?.length && !await confirm({ title: `Start ${courseTitle ?? 'this course'}?`, message: 'Review and accept these course rules before enrollment.', details: terms, confirmLabel: 'Accept and start', cancelLabel: 'Not now' })) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/enrollments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ courseId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { if (response.status === 401) { router.push('/register'); return; } setMessage(data.error || 'Unable to start this course.'); return; }
      if (redirectPath) router.push(redirectPath);
      else if (topicSlug) router.push(`/study/topic/${encodeURIComponent(topicSlug)}`);
      else { setMessage('Course added to your dashboard.'); router.refresh(); }
    } catch { setMessage('Unable to enroll right now. Please try again.'); }
    finally { setBusy(false); }
  }
  return <><button className="btn primary" onClick={enroll} disabled={busy}>{busy ? 'Starting...' : 'Start course'} <ArrowRight size={15}/></button>{message && <span className="notice">{message}</span>}</>;
}
