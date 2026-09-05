import { notFound } from 'next/navigation';
import { getDsaProblem } from '@/lib/dsa-data';
import { ProblemWorkspace } from '@/components/dsa/problem-workspace';
export default async function ProblemPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const {problem}=await getDsaProblem(slug);if(!problem)notFound();return <main className="page"><div className="container"><div className="breadcrumbs">DSA / Problems / {problem.title}</div><ProblemWorkspace problem={problem}/></div></main>}
