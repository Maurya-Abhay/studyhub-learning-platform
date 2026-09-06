import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { createClient } from '@/lib/supabase/server';
import { requireLearner } from '@/lib/guards';
export default async function Page(){
	const supabase=await createClient();
	const user=await requireLearner();
	const {data}=await supabase.from('topic_progress').select('progress,status,last_studied_at,study_topics(title,slug,estimated_minutes)').eq('user_id',user.id).order('last_studied_at',{ascending:false});
	const rows=(data??[]).map((item)=>{const topic=Array.isArray(item.study_topics)?item.study_topics[0]:item.study_topics;return { ...item, topic };}).filter((item)=>item.topic?.slug);
	const total=rows.length;
	const completed=rows.filter((item)=>item.progress>=100).length;
	const inProgress=rows.filter((item)=>item.progress>0&&item.progress<100).length;
	const average=total?Math.round(rows.reduce((sum,item)=>sum+Math.max(0,Math.min(100,item.progress??0)),0)/total):0;
	return <DashboardShell><div className="learner-progress-page"><div className="eyebrow">My learning</div><h1 className="title">Progress overview</h1><p className="subtitle">See what you have completed, what is active, and where to continue next.</p>
		<div className="progress-overview-grid"><div className="surface progress-overview-card progress-overview-primary"><div className="progress-overview-visual"><div className="progress-ring" style={{background:`conic-gradient(var(--brand) ${average}%, color-mix(in srgb,var(--brand) 13%,var(--panel)) 0)`}}><strong>{average}%</strong></div><div><span className="progress-overview-label">Overall progress</span><small>{completed} of {total} topics complete</small></div></div><div className="progress-breakdown"><span style={{width:`${total ? completed / total * 100 : 0}%`}}/><span style={{width:`${total ? inProgress / total * 100 : 0}%`}}/></div></div><div className="surface progress-overview-card"><span className="progress-overview-label">Topics tracked</span><strong>{total}</strong><small>Across your learning library</small></div><div className="surface progress-overview-card"><span className="progress-overview-label">In progress</span><strong>{inProgress}</strong><small>Topics ready to continue</small></div><div className="surface progress-overview-card"><span className="progress-overview-label">Completed</span><strong>{completed}</strong><small>Finished learning topics</small></div></div>
		<section className="surface card progress-list-card"><div className="progress-list-head"><div><div className="eyebrow">Topic activity</div><h2>Continue learning</h2></div><span className="chip active">{total} {total===1?'topic':'topics'}</span></div>{rows.length?<div className="progress-topic-list">{rows.map((item)=>{const topic=item.topic!;const value=Math.max(0,Math.min(100,item.progress??0));return <Link className="progress-topic-row" href={`/study/topic/${topic.slug}`} key={topic.slug}><span className="progress-topic-index">{value>=100?'✓':'→'}</span><span className="progress-topic-copy"><strong>{topic.title}</strong><small>{value>=100?'Completed':item.status==='not_started'?'Not started':'In progress'} · {topic.estimated_minutes} min</small><span className="progress"><span style={{width:`${value}%`}}/></span></span><b>{value}%</b><ChevronRight size={15}/></Link>})}</div>:<div className="progress-empty"><strong>No progress yet</strong><p>Open a topic from the study library to start tracking your learning.</p><Link className="btn primary small" href="/study">Explore topics</Link></div>}</section>
	</div></DashboardShell>;
}
