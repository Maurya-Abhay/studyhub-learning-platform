import { requireLearner } from '@/lib/guards';

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireLearner();
  return children;
}
