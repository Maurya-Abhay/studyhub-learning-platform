import { PublicShell } from '@/components/study/public-shell';
import { getDsaNavigationProblems, getDsaTopics } from '@/lib/dsa-data';

export default async function DsaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [dsaTopics, { problems: dsaProblems }] = await Promise.all([getDsaTopics(), getDsaNavigationProblems()]);
  return <PublicShell dsaTopics={dsaTopics} dsaProblems={dsaProblems}>{children}</PublicShell>;
}
