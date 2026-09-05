import { requireLearner } from '@/lib/guards';
import TestClient from '@/components/tests/test-client';

export default async function TestPage() {
  await requireLearner();
  return <TestClient />;
}
