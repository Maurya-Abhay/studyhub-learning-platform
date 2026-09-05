import Link from 'next/link';
import { ArrowLeft, Award, CheckCircle2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CertificateActions } from '@/components/study/certificate-actions';

type Certificate = { certificate_code: string; score: number; issued_at: string; revoked_at: string | null; profiles: { name: string | null } | null; courses: { title: string | null } | null };

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  let client;
  try { client = createAdminClient(); } catch { client = supabase; }
  const { data: row } = await client.from('certificates').select('certificate_code,score,issued_at,revoked_at,user_id,course_id').eq('certificate_code', id).maybeSingle();
  let certificate: Certificate | null = null;
  if (row) {
    const [{ data: profile }, { data: course }] = await Promise.all([
      client.from('profiles').select('name').eq('id', row.user_id).maybeSingle(),
      client.from('courses').select('title').eq('id', row.course_id).maybeSingle(),
    ]);
    certificate = { ...row, profiles: profile, courses: course } as unknown as Certificate;
  }
  const valid = Boolean(certificate && !certificate.revoked_at);
  const { data: { user } } = await supabase.auth.getUser();
  const profile = certificate?.profiles;
  const course = certificate?.courses;
  const issued = certificate ? new Date(certificate.issued_at) : null;
  const date = issued?.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  if (!valid || !certificate) return <main className="certificate-page"><Link href={user ? '/dashboard/certificates' : '/'} className="btn secondary small certificate-back"><ArrowLeft size={14} /> Back to certificates</Link><section className="certificate-invalid surface"><Award size={40} /><h1>Certificate not found</h1><p>No active certificate matches this verification code.</p></section></main>;

  return <main className="certificate-page">
    <div className="certificate-actions"><Link href={user ? '/dashboard/certificates' : '/'} className="btn secondary small"><ArrowLeft size={14} /> Back to certificates</Link><CertificateActions certificateCode={certificate.certificate_code} /></div>
    <article className="certificate-sheet">
      <div className="certificate-ribbon certificate-ribbon-top" /><div className="certificate-ribbon certificate-ribbon-bottom" />
      <div className="certificate-inner">
        <div className="certificate-topline"><div className="certificate-brand"><span className="certificate-brand-mark">S</span><span><strong>Study</strong>Hub</span></div><div className="certificate-seal"><Award size={25} /><strong>COURSE</strong><small>COMPLETED</small></div></div>
        <div className="certificate-qr"><span /><span /><span /><span /><b>{certificate.certificate_code.slice(-6)}</b></div>
        <div className="certificate-heading"><div className="certificate-kicker">Certificate of achievement</div><h1>Certificate</h1><div className="certificate-rule" /><p>This certificate is proudly awarded to</p></div>
        <h2 className="certificate-recipient">{profile?.name || 'StudyHub Learner'}</h2>
        <div className="certificate-rule certificate-rule-short" />
        <p className="certificate-copy">for successfully completing the course requirements for</p>
        <h3 className="certificate-course">{course?.title || 'Course completion'}</h3>
        <div className="certificate-details"><div><span>Enrollment date</span><strong>{date}</strong></div><div><span>Completion date</span><strong>{date}</strong></div><div><span>Certificate ID</span><strong>{certificate.certificate_code}</strong></div><div><span>Final score</span><strong>{certificate.score}%</strong></div></div>
        <div className="certificate-footer"><div><div className="certificate-signature">StudyHub</div><span>Learning platform</span></div><div className="certificate-valid"><CheckCircle2 size={15} /> <span>Verified credential<br /><small>studyhub certificate registry</small></span></div><div className="certificate-signature">StudyHub</div></div>
      </div>
    </article>
    <p className="certificate-verification"><ShieldCheck size={14} /> Verified certificate · ID {certificate.certificate_code}</p>
  </main>;
}
