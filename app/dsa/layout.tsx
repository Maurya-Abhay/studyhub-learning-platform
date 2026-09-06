import { PublicShell } from '@/components/study/public-shell';
import { getDsaNavigationProblems, getDsaTopics } from '@/lib/dsa-data';
import { requireLearner } from '@/lib/guards';

export default async function DsaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireLearner();
  const [dsaTopics, { problems: dsaProblems }] = await Promise.all([getDsaTopics(), getDsaNavigationProblems()]);
  return <PublicShell dsaTopics={dsaTopics} dsaProblems={dsaProblems}>{children}</PublicShell>;
}
