import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { UserManager } from '@/components/admin/user-manager';

export default async function Page() {
  const supabase = await createClient();
  const [{ data: users }] = await Promise.all([
    supabase.from('profiles').select('id,name,role,created_at').order('created_at', { ascending: false }),
  ]);
  return <DashboardShell admin><UserManager initialUsers={(users ?? []) as Array<{ id: string; name: string; role: 'user' | 'admin'; created_at: string }>} /></DashboardShell>;
}
