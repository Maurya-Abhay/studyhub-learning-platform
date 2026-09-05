import Link from 'next/link';
import { Activity, ArrowUpRight, Award, BarChart3, BrainCircuit, BookOpen, CheckCircle2, FolderKanban, ListChecks, Sparkles, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default async function Admin() {
  const supabase = await createClient();
  const [users, courses, topics, dsa, enrollments, attempts, certificates, activity, recentUsers] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('study_topics').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('dsa_problems').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('enrollments').select('id', { count: 'exact', head: true }),
    supabase.from('test_attempts').select('id', { count: 'exact', head: true }),
    supabase.from('certificates').select('id', { count: 'exact', head: true }),
    supabase.from('activity_logs').select('id,event_type,entity_type,metadata,created_at').order('created_at', { ascending: false }).limit(10),
    supabase.from('profiles').select('id,name,role,created_at').order('created_at', { ascending: false }).limit(8),
  ]);
  const metrics = [
    ['Users', users.count ?? 0, Users], ['Published courses', courses.count ?? 0, BookOpen], ['Published topics', topics.count ?? 0, Activity],
    ['DSA problems', dsa.count ?? 0, BrainCircuit], ['Enrollments', enrollments.count ?? 0, BarChart3], ['Test attempts', attempts.count ?? 0, CheckCircle2], ['Certificates', certificates.count ?? 0, Award],
  ] as const;
  const managementLinks = [
    ['/admin/categories', 'Categories', 'Organize the public learning library.', FolderKanban],
    ['/admin/topics', 'Topics', 'Write and publish learner-facing lessons.', BookOpen],
    ['/admin/courses', 'Courses', 'Assemble categories and topics into guided courses.', BookOpen],
    ['/admin/questions', 'Questions', 'Maintain the question bank.', ListChecks],
    ['/admin/tests', 'Tests', 'Create and manage assessments.', CheckCircle2],
    ['/admin/dsa', 'DSA Problems', 'Curate coding practice and test cases.', BrainCircuit],
    ['/admin/users', 'Users', 'Review accounts and learning activity.', Users],
    ['/admin/certificates', 'Certificates', 'Review issued learner certificates.', Award],
  ] as const;
  return (
    <DashboardShell admin>
      <>
      <div className="dash-grid admin-kpis">{metrics.map(([label, value, Icon]) => <div className="surface dash-card" key={label}><Icon size={16} color="var(--brand)"/><div className="kpi-num">{value}</div><div className="kpi-label">{label}</div></div>)}</div>
      <section className="surface card admin-tools-section"><div className="section-head"><div><div className="eyebrow">Management</div><h2 className="title" style={{fontSize:22}}>Content and operations</h2></div><span className="small muted">Live database workspace</span></div><div className="admin-tools">{managementLinks.map(([href,label,description,Icon]) => <Link className="admin-tool" href={href} key={href}><span className="admin-tool-icon"><Icon size={17}/></span><span className="admin-tool-copy"><strong>{label}</strong><small>{description}</small></span><ArrowUpRight className="admin-tool-arrow" size={16}/></Link>)}</div></section>
      <div className="two-col admin-recent-grid">
        <div className="surface card"><div className="section-head"><div><div className="eyebrow">Recent activity</div><h2 className="title" style={{fontSize:22}}>What learners are doing</h2></div></div>{activity.data?.length ? activity.data.map((item) => <div className="list-row" key={item.id}><div><strong>{String(item.event_type).replaceAll('_',' ')}</strong><div className="small muted">{new Date(item.created_at).toLocaleString()}</div></div><span className="chip">{item.entity_type ?? 'platform'}</span></div>) : <div className="empty">No activity has been logged yet.</div>}</div>
        <div className="surface card"><div className="eyebrow">Recent users</div><div style={{marginTop:10}}>{recentUsers.data?.length ? recentUsers.data.map((user) => <div className="list-row" key={user.id}><div><strong>{user.name || 'Learner'}</strong><div className="small muted">{new Date(user.created_at).toLocaleDateString()}</div></div><span className="chip active">{user.role}</span></div>) : <div className="empty">No users yet.</div>}</div></div>
      </div>
    </>
    </DashboardShell>
  );
}
