import Link from 'next/link';
import { Award, BarChart3, Check, ChevronRight, Clock3, Flame, PlayCircle, Sparkles, Target, BookOpen } from 'lucide-react';
import { getDashboardData } from '@/lib/dashboard-data';
import { NotesPanel } from '@/components/dashboard/notes-panel';

export async function DashboardHome() {
  const data = await getDashboardData();
  if (!data || 'error' in data) return <div className="surface empty dashboard-load-error"><strong>Dashboard unavailable</strong><p>{data?.error || 'Unable to load your dashboard.'}</p><Link href="/dashboard" className="btn secondary small">Try again</Link></div>;
  const current = data.activeTopics[0];
  const courseCards = data.courses.slice(0, 4);
  return <div className="learner-dashboard">
    <section className="dashboard-hero-card">
      <div><div className="eyebrow"><Sparkles size={12}/> Your learning workspace</div><h1 className="title">Welcome back, {data.name} 👋</h1><p className="subtitle">Keep learning consistently. Your next lesson, progress and assessments are connected here.</p><div className="hero-actions"><Link href={current?.topic?.slug ? `/study/topic/${current.topic.slug}` : '/study'} className="btn primary">{current ? 'Resume learning' : 'Explore the library'} <ChevronRight size={15}/></Link><Link href="/dsa" className="btn secondary">Practice DSA</Link></div></div>
      <div className="dashboard-hero-orbit"><div className="orbit-core">{data.averageProgress}%<span>overall</span></div><div className="orbit-dot one"/><div className="orbit-dot two"/></div>
    </section>

    <div className="dash-grid dashboard-kpis">
      <div className="surface dash-card"><Flame size={17} color="var(--warn)"/><div className="kpi-num">{data.streakDays}</div><div className="kpi-label">Day streak</div></div>
      <div className="surface dash-card"><Target size={17} color="var(--brand)"/><div className="kpi-num">{data.courses.length}</div><div className="kpi-label">Courses enrolled</div></div>
      <div className="surface dash-card"><Check size={17} color="var(--good)"/><div className="kpi-num">{data.completedTopics}</div><div className="kpi-label">Topics completed</div></div>
      <div className="surface dash-card"><PlayCircle size={17} color="var(--brand)"/><div className="kpi-num">{data.solved}</div><div className="kpi-label">DSA solved</div></div>
      <div className="surface dash-card"><BarChart3 size={17} color="#5bc0eb"/><div className="kpi-num">{data.averageProgress}%</div><div className="kpi-label">Overall topic progress</div></div>
    </div>

    <div className="dashboard-content-grid">
      <section className="surface card">
        <div className="section-head"><div><div className="eyebrow">Continue learning</div><h2 className="title" style={{fontSize:22}}>Pick up where you left off</h2></div><Link href="/dashboard/progress" className="small link">View progress</Link></div>
        {data.activeTopics.length ? <div className="learning-card-grid">{data.activeTopics.map(item => <Link className="learning-card" href={item.topic?.slug ? `/study/topic/${item.topic.slug}` : '/study'} key={item.topic_id}><div className="learning-card-icon"><BookGlyph /></div><div className="learning-card-copy"><strong>{item.topic?.title || 'Topic in progress'}</strong><span>{item.progress}% complete</span><span className="progress"><span style={{width:`${item.progress}%`}}/></span></div><ChevronRight size={15}/></Link>)}</div> : <div className="empty">Start a published topic and it will appear here with live progress.</div>}
      </section>

      <section className="surface card">
        <div className="section-head"><div><div className="eyebrow">Next up</div><h2 className="title" style={{fontSize:22}}>Study schedule</h2></div><Link href="/dashboard/schedule" className="small link">Manage</Link></div>
        {data.schedule.length ? data.schedule.map(item => <div className="schedule-item" key={item.id}><div className="schedule-time">{new Date(item.starts_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div><div className="schedule-copy"><strong>{item.title}</strong><small>{item.duration_minutes} min</small></div><Clock3 size={14}/></div>) : <div className="empty">No upcoming study sessions. Add one to make your plan visible here.</div>}
      </section>
    </div>

    <div className="dashboard-content-grid dashboard-lower-grid">
      <section className="surface card">
        <div className="section-head"><div><div className="eyebrow">My courses</div><h2 className="title" style={{fontSize:22}}>Your active paths</h2></div><Link href="/dashboard/courses" className="small link">Browse all</Link></div>
        {courseCards.length ? <div className="mini-course-grid">{courseCards.map(item => { const c = Array.isArray(item.courses) ? item.courses[0] : item.courses; return <Link href={c?.slug ? `/dashboard/courses?course=${encodeURIComponent(c.slug)}` : '/dashboard/courses'} className="mini-course" key={item.id}><span className="mini-course-badge"><Target size={13}/></span><div><strong>{c?.title || 'Course'}</strong><small>Started {new Date(item.started_at).toLocaleDateString()}</small></div><ChevronRight size={14}/></Link>})}</div> : <div className="empty">Enroll in a course to build a guided learning path.</div>}
      </section>

      <section className="surface card dashboard-notes-section">
        <div className="section-head"><div><div className="eyebrow">Notes</div><h2 className="title" style={{fontSize:22}}>Your study notes</h2></div><Link href="/dashboard/notes" className="small link">Open notes</Link></div>
        <NotesPanel notes={data.notes} />
      </section>
    </div>

    <div className="dashboard-content-grid">
      <section className="surface card"><div className="section-head"><div><div className="eyebrow">Assessment history</div><h2 className="title" style={{fontSize:22}}>Recent tests</h2></div><Link href="/dashboard/tests" className="small link">All tests</Link></div>{data.tests.length ? data.tests.slice(0,5).map(item => {const test = Array.isArray(item.tests) ? item.tests[0] : item.tests;return <div className="list-row" key={item.id}><div><strong>{test?.title || 'Assessment'}</strong><div className="small muted">{item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'In progress'}</div></div><span className={`chip ${item.passed ? 'active' : ''}`}>{item.score ?? 0}% · {item.passed ? 'Passed' : 'Review'}</span></div>}) : <div className="empty">Your submitted tests will appear here.</div>}</section>
      <section className="surface card"><div className="section-head"><div><div className="eyebrow">Achievements</div><h2 className="title" style={{fontSize:22}}>Milestones</h2></div><Link href="/dashboard/certificates" className="small link">Certificates</Link></div><div className="achievement-row"><span><Award size={16}/></span><div><strong>{data.certificates} certificates</strong><small>Issued after eligible course completion.</small></div></div><div className="achievement-row"><span><Sparkles size={16}/></span><div><strong>{data.bookmarks} saved topics</strong><small>Keep useful lessons one click away.</small></div></div></section>
    </div>
  </div>;
}

function BookGlyph() { return <BookOpen size={17} strokeWidth={1.8} />; }
