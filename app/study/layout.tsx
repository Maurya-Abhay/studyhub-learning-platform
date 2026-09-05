import { PublicShell } from '@/components/study/public-shell';
import { getStudyLibrary } from '@/lib/study-data';
import { getDsaNavigationProblems, getDsaTopics } from '@/lib/dsa-data';

export default async function StudyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [{ categories, topics }, dsaTopics, { problems: dsaProblems }] = await Promise.all([getStudyLibrary(), getDsaTopics(), getDsaNavigationProblems()]);
  return <PublicShell categories={categories} topics={topics} dsaTopics={dsaTopics} dsaProblems={dsaProblems}>{children}</PublicShell>;
}
