import { requireLearner } from '@/lib/guards';
import ResultClient from '@/components/tests/result-client';

export default async function ResultPage() {
  await requireLearner();
  return <ResultClient />;
}
