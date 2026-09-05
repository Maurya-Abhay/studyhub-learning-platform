import Link from 'next/link';
import { Award, CalendarDays, ChevronRight, ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('certificates').select('certificate_code,score,issued_at,revoked_at,courses(title)').eq('user_id', user.id).order('issued_at', { ascending: false });
  const certificates = data ?? [];
  return <DashboardShell>
    <div className="learner-record-page certificates-page">
      <div className="eyebrow">Achievement center</div><h1 className="title">Certificates</h1><p className="subtitle">Your verified course completions and earned credentials.</p>
      <div className="record-summary"><div className="surface record-summary-card"><Award size={18}/><strong>{certificates.length}</strong><span>Certificates earned</span></div><div className="surface record-summary-card"><ShieldCheck size={18}/><strong>{certificates.filter((item) => !item.revoked_at).length}</strong><span>Active credentials</span></div></div>
      <section className="surface card record-panel"><div className="record-panel-head"><div><div className="eyebrow">Credential history</div><h2>Your certificates</h2></div><span className="chip active">{certificates.length}</span></div>
        {certificates.length ? <div className="record-list">{certificates.map((certificate) => { const course = Array.isArray(certificate.courses) ? certificate.courses[0] : certificate.courses; return <div className="record-row" key={certificate.certificate_code}><span className="record-icon"><Award size={16}/></span><span className="record-copy"><strong>{course?.title || 'Course certificate'}</strong><small><CalendarDays size={12}/> {new Date(certificate.issued_at).toLocaleDateString()} · Score {certificate.score}%</small></span><Link className={`record-action ${certificate.revoked_at ? 'muted-action' : ''}`} href={`/study/certificates/${certificate.certificate_code}`}>{certificate.revoked_at ? 'Revoked' : 'Verify'} <ChevronRight size={14}/></Link></div>; })}</div> : <div className="record-empty"><Award size={22}/><strong>No certificates yet</strong><p>Complete an eligible course assessment to earn your first certificate.</p><Link className="btn primary small" href="/dashboard/courses">Explore courses</Link></div>}
      </section>
    </div>
  </DashboardShell>;
}
