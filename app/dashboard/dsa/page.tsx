import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ProblemWorkspace } from '@/components/dsa/problem-workspace';
import { getDsaProblem } from '@/lib/dsa-data';
import { getDsaNavigationProblems, getDsaTopics } from '@/lib/dsa-data';

export default async function Page({ searchParams }: { searchParams: Promise<{ problem?: string }> }) {
  const { problem: problemSlug } = await searchParams;
  const problem = problemSlug ? (await getDsaProblem(problemSlug)).problem : undefined;
  const [{ problems: navigationProblems }, dsaTopics] = await Promise.all([getDsaNavigationProblems(), getDsaTopics()]);

  return <DashboardShell>{problem ? <div className="dashboard-topic-reader dsa-reader"><ProblemWorkspace problem={problem} topics={dsaTopics} navigationProblems={navigationProblems} /></div> : <div className="learner-page dsa-empty-page"><div className="breadcrumbs dashboard-course-breadcrumb">Dashboard / DSA</div><h1 className="title">DSA practice</h1><div className="surface card empty">Select a DSA problem from the sidebar.</div></div>}</DashboardShell>;
}