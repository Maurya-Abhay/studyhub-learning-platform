import Link from 'next/link';
import { ArrowLeft, Award, CalendarDays, CheckCircle2, ShieldOff } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

type Certificate = { certificate_code: string; score: number; issued_at: string; revoked_at: string | null; user_id: string; course_id: string };

export default async function AdminCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: certificate } = await admin.from('certificates').select('certificate_code,score,issued_at,revoked_at,user_id,course_id').eq('certificate_code', id).maybeSingle() as { data: Certificate | null };
  const [{ data: profile }, { data: course }] = certificate
    ? await Promise.all([
        admin.from('profiles').select('name').eq('id', certificate.user_id).maybeSingle(),
        admin.from('courses').select('title').eq('id', certificate.course_id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];

  return <DashboardShell admin>
    <div className="admin-certificate-page">
      <Link className="btn secondary small" href="/admin/certificates"><ArrowLeft size={14} /> Back to certificates</Link>
      <section className="surface admin-certificate-card">
        <div className="admin-certificate-icon"><Award size={28} /></div>
        <div className="eyebrow">Admin certificate preview</div>
        <h1 className="title">{certificate ? 'Certificate details' : 'Certificate not found'}</h1>
        {certificate ? <>
          <p className="subtitle">Internal preview for this learner credential. This page is only available to administrators.</p>
          <div className="admin-certificate-learner"><strong>{profile?.name || 'Learner'}</strong><span>{course?.title || 'Course unavailable'}</span></div>
          <div className="admin-certificate-grid"><div><CalendarDays size={15} /><small>Issued</small><strong>{new Date(certificate.issued_at).toLocaleDateString()}</strong></div><div><CheckCircle2 size={15} /><small>Score</small><strong>{certificate.score}%</strong></div><div><ShieldOff size={15} /><small>Status</small><strong>{certificate.revoked_at ? 'Revoked' : 'Valid'}</strong></div></div>
          <div className="notice admin-certificate-code">{certificate.certificate_code}</div>
        </> : <p className="subtitle">No certificate matches this code.</p>}
      </section>
    </div>
  </DashboardShell>;
}
