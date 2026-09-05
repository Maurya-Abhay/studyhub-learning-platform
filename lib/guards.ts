import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect('/login');
  return data.user;
}

export async function getCurrentRole(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  return data?.role === 'admin' ? 'admin' : data?.role === 'user' ? 'user' : null;
}

export async function requireLearner() {
  const user = await requireUser();
  const role = await getCurrentRole(user.id);
  if (role === 'admin') redirect('/admin');
  if (role !== 'user') redirect('/login');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const role = await getCurrentRole(user.id);
  if (role !== 'admin') redirect('/dashboard');
  return user;
}
