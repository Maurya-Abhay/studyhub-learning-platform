import Link from 'next/link';
import { CheckCircle2, ChevronRight, ClipboardCheck, Clock3, Target } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
export default async function Page(){
	const supabase=await createClient();
	const {data:{user}}=await supabase.auth.getUser();
	if(!user)return null;
	const [{data:tests},{data:attemptRows}]=await Promise.all([
		supabase.from('tests').select('id,title,duration_minutes,passing_score,unlock_days,required_progress,published,course_id,courses(title,slug)').eq('published',true).order('title'),
		supabase.from('test_attempts').select('id,test_id,score,passed,submitted_at,tests(title)').eq('user_id',user.id).order('submitted_at',{ascending:false}).limit(8),
	]);
	const attempts=attemptRows??[];
	const passed=attempts.filter((attempt)=>attempt.passed).length;
	const scored=attempts.filter((attempt)=>typeof attempt.score==='number');
	const average=scored.length?Math.round(scored.reduce((sum,attempt)=>sum+(attempt.score??0),0)/scored.length):0;
	return <DashboardShell><div className="learner-tests-page"><div className="eyebrow">My learning</div><h1 className="title">Assessments</h1><p className="subtitle">Practice with focused tests and keep your attempt history in one place.</p>
		<div className="tests-overview-grid"><div className="surface tests-overview-card tests-overview-primary"><ClipboardCheck size={17}/><strong>{tests?.length??0}</strong><span>Available tests</span></div><div className="surface tests-overview-card"><Target size={17}/><strong>{attempts.length}</strong><span>Attempts recorded</span></div><div className="surface tests-overview-card"><CheckCircle2 size={17}/><strong>{passed}</strong><span>Passed attempts</span></div><div className="surface tests-overview-card"><span className="tests-score-icon">%</span><strong>{average}%</strong><span>Average score</span></div></div>
		<div className="tests-content-grid"><section className="surface card tests-panel"><div className="tests-panel-head"><div><div className="eyebrow">Assessment library</div><h2>Available tests</h2></div><span className="chip active">{tests?.length??0} tests</span></div>{tests?.length?<div className="tests-list">{tests.map(test=>{const course=Array.isArray(test.courses)?test.courses[0]:test.courses;return <Link className="test-row" href={`/tests/${test.id}`} key={test.id}><span className="test-row-icon"><ClipboardCheck size={16}/></span><span className="test-row-copy"><strong>{test.title}</strong><small>{course?.title||'Assessment'} · {test.passing_score}% pass</small><span><Clock3 size={12}/> {test.duration_minutes} min</span></span><span className="test-row-action">Start <ChevronRight size={15}/></span></Link>})}</div>:<div className="tests-empty"><strong>No published tests yet</strong><p>Published assessments will appear here when they are ready.</p></div>}</section>
			<section className="surface card tests-panel"><div className="tests-panel-head"><div><div className="eyebrow">Your activity</div><h2>Recent attempts</h2></div><span className="chip">{attempts.length}</span></div>{attempts.length?<div className="attempt-list">{attempts.map(attempt=>{const test=Array.isArray(attempt.tests)?attempt.tests[0]:attempt.tests;return <div className="attempt-row" key={attempt.id}><span className={`attempt-status ${attempt.passed?'passed':''}`}>{attempt.passed?<CheckCircle2 size={15}/>:<Target size={15}/>}</span><span><strong>{test?.title||'Assessment attempt'}</strong><small>{attempt.submitted_at?new Date(attempt.submitted_at).toLocaleDateString():'In progress'}</small></span><b className={attempt.passed?'passed':''}>{attempt.score??0}%</b></div>})}</div>:<div className="tests-empty"><strong>No attempts yet</strong><p>Complete a test and your score will appear here.</p></div>}</section>
		</div>
	</div></DashboardShell>;
}
