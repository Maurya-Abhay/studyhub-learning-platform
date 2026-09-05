import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ProblemWorkspace } from '@/components/dsa/problem-workspace';
import { getDsaProblem } from '@/lib/dsa-data';

export default async function Page({ searchParams }: { searchParams: Promise<{ problem?: string }> }) {
  const { problem: problemSlug } = await searchParams;
  const problem = problemSlug ? (await getDsaProblem(problemSlug)).problem : undefined;

  return <DashboardShell>{problem ? <div className="dashboard-topic-reader dsa-reader"><ProblemWorkspace problem={problem} /></div> : <div className="learner-page dsa-empty-page"><div className="eyebrow">My learning</div><h1 className="title">DSA practice</h1><p className="subtitle">Choose a problem from the sidebar to start practicing.</p><div className="surface card empty">Select a DSA problem from the sidebar.</div></div>}</DashboardShell>;
}