import { requireAdmin } from '@/lib/guards';

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return children;
}
