import Link from 'next/link';
import { BrainCircuit, CircleCheck, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getDsaProblems, getDsaTopics } from '@/lib/dsa-data';
import { ProblemList } from '@/components/dsa/problem-list';

export default async function DsaHome({ searchParams }: { searchParams: Promise<{ topic?: string; difficulty?: string }> }) {
  const params = await searchParams;
  const { problems: allProblems, error } = await getDsaProblems();
  const topics = await getDsaTopics();
  let user: { id: string } | null = null;
  let solvedRows: Array<{ problem_id: string; status: string }> = [];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = await createClient();
    const auth = await supabase.auth.getUser();
    user = auth.data.user ? { id: auth.data.user.id } : null;
    if (user) {
      const { data } = await supabase.from('dsa_submissions').select('problem_id,status').eq('user_id', user.id).eq('status', 'accepted');
      solvedRows = data ?? [];
    }
  }
  const solvedIds = Array.from(new Set((solvedRows ?? []).map((row) => row.problem_id)));
  const selectedTopic = params.topic ?? '';
  const difficulty = params.difficulty ?? '';
  const selectedTopicId = topics.find((topic) => topic.slug === selectedTopic)?.id ?? '';
  const problems = allProblems.filter((problem) => (!selectedTopicId || problem.topicId === selectedTopicId) && (!difficulty || problem.difficulty === difficulty));
  const easy = problems.filter((p) => p.difficulty === 'Easy').length;
  const medium = problems.filter((p) => p.difficulty === 'Medium').length;
  const hard = problems.filter((p) => p.difficulty === 'Hard').length;
  const patterns = new Set(problems.map((p) => p.pattern).filter(Boolean)).size;

  return <main className="page"><div className="container dsa-hero">
    <div className="eyebrow"><BrainCircuit size={14}/> DSA practice</div>
    <h1 className="title" style={{fontSize:50,marginTop:8}}>Solve. Review. Improve.</h1>
    <p className="subtitle" style={{maxWidth:720}}>A separate problem-solving workspace for patterns, hints, approaches, Java solutions and real submissions.</p>
    <div className="filter-bar" style={{marginTop:18}}><span className="chip"><Filter size={13}/> Topics</span><Link className={`chip ${!selectedTopic?'active':''}`} href="/dsa">All</Link>{topics.map((topic)=><Link key={topic.id} className={`chip ${selectedTopic===topic.slug?'active':''}`} href={`/dsa?topic=${encodeURIComponent(topic.slug)}`}>{topic.name}</Link>)}</div>
    <div className="filter-bar"><span className="chip">Difficulty</span>{['Easy','Medium','Hard'].map(level=><Link key={level} className={`chip ${difficulty===level?'active':''}`} href={`/dsa?${new URLSearchParams({...selectedTopic?{topic:selectedTopic}:{},difficulty:level}).toString()}`}>{level}</Link>)}</div>
    <div className="dash-grid" style={{marginTop:18}}><div className="surface dash-card"><CircleCheck size={18} color="var(--good)"/><div className="kpi-num">{solvedIds.length}</div><div className="kpi-label">Solved for your account</div></div><div className="surface dash-card"><div className="kpi-num">{easy}</div><div className="kpi-label">Easy available</div></div><div className="surface dash-card"><div className="kpi-num">{medium}</div><div className="kpi-label">Medium available</div></div><div className="surface dash-card"><div className="kpi-num">{hard}</div><div className="kpi-label">Hard available · {patterns} patterns</div></div></div>
    {error?<div className="surface empty" style={{marginTop:15}}>DSA problems are unavailable right now. {error}</div>:<div style={{marginTop:15}}><ProblemList problems={problems} solvedIds={solvedIds}/></div>}
  </div></main>;
}
