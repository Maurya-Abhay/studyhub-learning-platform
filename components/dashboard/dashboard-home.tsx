import Link from 'next/link';
import { Award, BarChart3, Check, ChevronRight, Flame, PlayCircle, Sparkles, Target } from 'lucide-react';
import { getDashboardData } from '@/lib/dashboard-data';

export async function DashboardHome() {
  const data = await getDashboardData();
  if (!data || 'error' in data) return <div className="surface empty dashboard-load-error"><strong>Dashboard unavailable</strong><p>{data?.error || 'Unable to load your dashboard.'}</p><Link href="/dashboard" className="btn secondary small">Try again</Link></div>;
  const current = data.activeTopics[0];
  const courseCards = data.courses.slice(0, 4);
  return <div className="learner-dashboard dashboard-home-premium">
    <section className="dashboard-hero-card">
      <div><div className="eyebrow"><Sparkles size={12}/> Your learning workspace</div><h1 className="title">Welcome back, {data.name}</h1><p className="subtitle">Your progress, next lesson and study rhythm in one place.</p><div className="hero-actions"><Link href={current?.topic?.slug ? `/study/topic/${current.topic.slug}` : '/study'} className="btn primary">{current ? 'Resume learning' : 'Explore library'} <ChevronRight size={15}/></Link><Link href="/dsa" className="btn secondary">Practice DSA</Link></div></div>
      <div className="dashboard-hero-orbit"><div className="orbit-core">{data.averageProgress}%<span>overall</span></div><div className="orbit-dot one"/><div className="orbit-dot two"/></div>
    </section>

    <div className="dash-grid dashboard-kpis">
      <div className="surface dash-card"><Flame size={17} color="var(--warn)"/><div className="kpi-num">{data.streakDays}</div><div className="kpi-label">Day streak</div></div>
      <div className="surface dash-card"><Target size={17} color="var(--brand)"/><div className="kpi-num">{data.courses.length}</div><div className="kpi-label">Courses enrolled</div></div>
      <div className="surface dash-card"><Check size={17} color="var(--good)"/><div className="kpi-num">{data.completedTopics}</div><div className="kpi-label">Topics completed</div></div>
      <div className="surface dash-card"><PlayCircle size={17} color="var(--brand)"/><div className="kpi-num">{data.solved}</div><div className="kpi-label">DSA solved</div></div>
      <div className="surface dash-card"><BarChart3 size={17} color="#5bc0eb"/><div className="kpi-num">{data.averageProgress}%</div><div className="kpi-label">Overall topic progress</div></div>
    </div>

    <div className="dashboard-content-grid dashboard-lower-grid dashboard-single-section">
      <section className="surface card">
        <div className="section-head"><div><div className="eyebrow">My courses</div><h2 className="title" style={{fontSize:22}}>Your active paths</h2></div><Link href="/dashboard/courses" className="small link">Browse all</Link></div>
        {courseCards.length ? <div className="mini-course-grid">{courseCards.map(item => { const c = Array.isArray(item.courses) ? item.courses[0] : item.courses; return <Link href={c?.slug ? `/dashboard/courses?course=${encodeURIComponent(c.slug)}` : '/dashboard/courses'} className="mini-course" key={item.id}><span className="mini-course-badge"><Target size={13}/></span><div><strong>{c?.title || 'Course'}</strong><small>Started {new Date(item.started_at).toLocaleDateString()}</small></div><ChevronRight size={14}/></Link>})}</div> : <div className="empty">Enroll in a course to build a guided learning path.</div>}
      </section>

    </div>

    <div className="dashboard-content-grid">
      <section className="surface card"><div className="section-head"><div><div className="eyebrow">Assessment history</div><h2 className="title" style={{fontSize:22}}>Recent tests</h2></div><Link href="/dashboard/tests" className="small link">All tests</Link></div>{data.tests.length ? data.tests.slice(0,5).map(item => {const test = Array.isArray(item.tests) ? item.tests[0] : item.tests;return <div className="list-row" key={item.id}><div><strong>{test?.title || 'Assessment'}</strong><div className="small muted">{item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'In progress'}</div></div><span className={`chip ${item.passed ? 'active' : ''}`}>{item.score ?? 0}% · {item.passed ? 'Passed' : 'Review'}</span></div>}) : <div className="dashboard-empty-state"><span className="dashboard-empty-icon"><Target size={16}/></span><div><strong>No test attempts yet</strong><p>Your scores will appear here after an assessment.</p></div><Link className="small link" href="/dashboard/tests">Browse tests</Link></div>}</section>
      <section className="surface card"><div className="section-head"><div><div className="eyebrow">Achievements</div><h2 className="title" style={{fontSize:22}}>Milestones</h2></div><Link href="/dashboard/certificates" className="small link">Certificates</Link></div><div className="achievement-row"><span><Award size={16}/></span><div><strong>{data.certificates} certificates</strong><small>Issued after eligible course completion.</small></div></div><div className="achievement-row"><span><Sparkles size={16}/></span><div><strong>{data.bookmarks} saved topics</strong><small>Keep useful lessons one click away.</small></div></div></section>
    </div>
  </div>;
}

