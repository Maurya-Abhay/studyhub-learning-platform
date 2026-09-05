import Link from 'next/link';
import { Award, BookOpen, Bookmark, CalendarDays, CheckCircle2, ChevronRight, CircleUserRound, Code2, FileText, Layers3, Mail, ScanLine, ShieldCheck, Sparkles, Target, Trophy } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { requireUser } from '@/lib/guards';
import { createClient } from '@/lib/supabase/server';

function clamp(value: number, min = 0, max = 100) { return Math.max(min, Math.min(max, value)); }
function formatDate(value: string | null | undefined) { return value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available'; }

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [profileResult, progressResult, enrollmentsResult, submissionsResult, attemptsResult, certificatesResult, notesResult, bookmarksResult] = await Promise.all([
    supabase.from('profiles').select('name,role,created_at').eq('id', user.id).maybeSingle(),
    supabase.from('topic_progress').select('progress,status,completed_at,last_studied_at,topic_id,study_topics(title,slug)').eq('user_id', user.id).order('last_studied_at', { ascending: false }),
    supabase.from('enrollments').select('id,started_at,completed_at,courses(title,slug)').eq('user_id', user.id).order('started_at', { ascending: false }),
    supabase.from('dsa_submissions').select('id,status,problem_id,created_at,language,dsa_problems(title,slug)').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('test_attempts').select('id,score,passed,submitted_at,tests(title)').eq('user_id', user.id).not('submitted_at', 'is', null).order('submitted_at', { ascending: false }),
    supabase.from('certificates').select('id,score,issued_at,courses(title,slug)').eq('user_id', user.id).order('issued_at', { ascending: false }),
    supabase.from('personal_notes').select('id,updated_at,study_topics(title,slug)').eq('user_id', user.id),
    supabase.from('bookmarks').select('topic_id').eq('user_id', user.id),
  ]);
  const profile = profileResult.data;
  const role = profile?.role === 'admin' ? 'admin' : 'user';
  const progress = progressResult.data ?? [];
  const enrollments = enrollmentsResult.data ?? [];
  const submissions = submissionsResult.data ?? [];
  const attempts = attemptsResult.data ?? [];
  const certificates = certificatesResult.data ?? [];
  const topicsCompleted = progress.filter((item) => (item.progress ?? 0) >= 100).length;
  const topicsInProgress = progress.filter((item) => (item.progress ?? 0) > 0 && (item.progress ?? 0) < 100).length;
  const averageProgress = progress.length ? Math.round(progress.reduce((sum, item) => sum + clamp(item.progress ?? 0), 0) / progress.length) : 0;
  const solvedIds = new Set(submissions.filter((item) => item.status === 'accepted').map((item) => item.problem_id));
  const passedTests = attempts.filter((item) => item.passed).length;
  const learningPoints = topicsCompleted * 2 + solvedIds.size + passedTests;
  const level = Math.max(1, Math.min(20, 1 + Math.floor(learningPoints / 5)));
  const levelProgress = Math.round(((learningPoints % 5) / 5) * 100);
  const displayName = profile?.name || user.email?.split('@')[0] || 'Learner';
  const initials = displayName.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase();
  const recentProgress = progress.filter((item) => item.last_studied_at).slice(0, 4);
  const recentDsa = submissions.slice(0, 3);
  const notesCount = notesResult.data?.length ?? 0;
  const bookmarksCount = bookmarksResult.data?.length ?? 0;

  return <DashboardShell admin={role === 'admin'}>
    <div className="profile-page-content">
      <div className="section-head profile-page-head"><div /><Link className="btn secondary small" href="/dashboard"><CircleUserRound size={14} /> Dashboard</Link></div>
      <section className="profile-hero surface">
        <div className="profile-identity"><div className="profile-avatar" aria-label={`${displayName} avatar`}>{initials || 'L'}</div><div className="profile-identity-copy"><div className="profile-name-line"><h2>{displayName}</h2><span className="profile-verified"><CheckCircle2 size={13} /> Active learner</span></div><p><Mail size={14} /> {user.email}</p><div className="profile-meta"><span><CalendarDays size={13} /> Joined {formatDate(profile?.created_at)}</span><span><ShieldCheck size={13} /> {role === 'admin' ? 'Administrator' : 'Student account'}</span></div></div></div>
        <div className="profile-level"><div className="profile-level-top"><span>Current level</span><strong>Level {level}</strong></div><div className="profile-level-track"><span style={{ width: `${levelProgress}%` }} /></div><small>{5 - Math.floor(learningPoints % 5)} points to the next level</small></div>
        <div className="profile-scan-card"><div className="profile-scan-visual"><ScanLine size={23} /><span>{initials || 'SH'}</span></div><div><strong>StudyHub ID</strong><small>Scan to identify this learner</small><code>{user.id.slice(0, 8).toUpperCase()}</code></div></div>
      </section>
      <section className="profile-metrics" aria-label="Learning statistics">
        <div className="profile-metric"><span className="profile-metric-icon blue"><BookOpen size={17} /></span><div><strong>{topicsCompleted}</strong><small>Topics completed</small></div></div><div className="profile-metric"><span className="profile-metric-icon violet"><Code2 size={17} /></span><div><strong>{solvedIds.size}</strong><small>DSA solved</small></div></div><div className="profile-metric"><span className="profile-metric-icon green"><Target size={17} /></span><div><strong>{averageProgress}%</strong><small>Average progress</small></div></div><div className="profile-metric"><span className="profile-metric-icon orange"><Trophy size={17} /></span><div><strong>{passedTests}</strong><small>Tests passed</small></div></div><div className="profile-metric"><span className="profile-metric-icon pink"><Award size={17} /></span><div><strong>{certificates.length}</strong><small>Certificates</small></div></div><div className="profile-metric"><span className="profile-metric-icon teal"><Layers3 size={17} /></span><div><strong>{enrollments.length}</strong><small>Courses joined</small></div></div>
      </section>
      <div className="profile-content-grid">
        <section className="surface profile-panel"><div className="profile-panel-heading"><div><div className="eyebrow">Learning pulse</div><h2>Your progress</h2></div><span className="chip active">{averageProgress}% overall</span></div><div className="profile-progress-feature"><div className="profile-progress-ring" style={{ background: `radial-gradient(var(--panel) 57%, transparent 58%), conic-gradient(var(--brand) ${averageProgress}%, var(--line) 0)` }}><strong>{averageProgress}<small>%</small></strong></div><div><h3>Keep your momentum</h3><p>{topicsInProgress ? `${topicsInProgress} topic${topicsInProgress === 1 ? '' : 's'} currently in progress.` : 'Start a topic to begin building your learning streak.'}</p><div className="progress profile-wide-progress"><span style={{ width: `${averageProgress}%` }} /></div><small>{topicsCompleted} complete · {topicsInProgress} active · {progress.length} tracked</small></div></div><div className="profile-activity-list"><div className="profile-subheading"><strong>Recent study activity</strong><Link href="/dashboard/progress">View all <ChevronRight size={13} /></Link></div>{recentProgress.length ? recentProgress.map((item) => { const topic = Array.isArray(item.study_topics) ? item.study_topics[0] : item.study_topics; const value = clamp(item.progress ?? 0); return <Link className="profile-activity-row" href={topic?.slug ? `/study/topic/${topic.slug}` : '/dashboard/progress'} key={item.topic_id}><span className="profile-activity-icon"><BookOpen size={15} /></span><span><strong>{topic?.title || 'Study topic'}</strong><small>Last studied {formatDate(item.last_studied_at)}</small></span><b>{value}%</b><ChevronRight size={14} /></Link>; }) : <p className="profile-empty">Your study activity will appear here after you open a topic.</p>}</div></section>
        <section className="surface profile-panel profile-achievements"><div className="profile-panel-heading"><div><div className="eyebrow">Milestones</div><h2>Achievements</h2></div><Sparkles size={18} className="profile-sparkle" /></div><div className="achievement-list"><div className={`achievement-item ${topicsCompleted >= 1 ? 'unlocked' : ''}`}><span><BookOpen size={16} /></span><div><strong>First topic</strong><small>{topicsCompleted >= 1 ? 'You started your learning journey' : 'Complete your first topic'}</small></div></div><div className={`achievement-item ${solvedIds.size >= 1 ? 'unlocked' : ''}`}><span><Code2 size={16} /></span><div><strong>Problem solver</strong><small>{solvedIds.size >= 1 ? 'First DSA problem solved' : 'Solve your first DSA problem'}</small></div></div><div className={`achievement-item ${passedTests >= 1 ? 'unlocked' : ''}`}><span><Trophy size={16} /></span><div><strong>Test ready</strong><small>{passedTests >= 1 ? 'Passed an assessment' : 'Pass your first assessment'}</small></div></div><div className={`achievement-item ${certificates.length >= 1 ? 'unlocked' : ''}`}><span><Award size={16} /></span><div><strong>Certified</strong><small>{certificates.length >= 1 ? 'Earned a certificate' : 'Earn a course certificate'}</small></div></div></div></section>
      </div>
      <div className="profile-lower-grid"><section className="surface profile-panel"><div className="profile-panel-heading"><div><div className="eyebrow">Practice history</div><h2>DSA activity</h2></div><Link href="/dashboard/dsa" className="text-link">Open DSA <ChevronRight size={13} /></Link></div>{recentDsa.length ? <div className="profile-dsa-list">{recentDsa.map((item) => { const problem = Array.isArray(item.dsa_problems) ? item.dsa_problems[0] : item.dsa_problems; return <div className="profile-dsa-row" key={item.id}><span className={`profile-dsa-status ${item.status === 'accepted' ? 'passed' : ''}`}><Code2 size={14} /></span><div><strong>{problem?.title || 'DSA problem'}</strong><small>{item.language?.toUpperCase() || 'JAVA'} · {formatDate(item.created_at)}</small></div><span className={`chip ${item.status === 'accepted' ? 'active' : ''}`}>{item.status}</span></div>; })}</div> : <p className="profile-empty">No DSA submissions yet. Your solved problems will show here.</p>}</section><section className="surface profile-panel"><div className="profile-panel-heading"><div><div className="eyebrow">Your library</div><h2>Saved learning</h2></div></div><div className="saved-learning-grid"><div><Bookmark size={16} /><strong>{bookmarksCount}</strong><small>Bookmarks</small></div><div><FileText size={16} /><strong>{notesCount}</strong><small>Notes written</small></div><div><Award size={16} /><strong>{certificates.length}</strong><small>Certificates</small></div></div><Link href="/dashboard/notes" className="profile-library-link">Open your notes <ChevronRight size={14} /></Link></section></div>
    </div>
  </DashboardShell>;
}
