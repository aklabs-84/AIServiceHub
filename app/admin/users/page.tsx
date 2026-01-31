import AdminUsersClient from './AdminUsersClient';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { getAllUsersServer } from '@/lib/dbServer';
import type { UserProfile } from '@/lib/db';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  let initialUsers: UserProfile[] = [];
  let initialIsAdmin = false;

  if (user?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    initialIsAdmin = profile?.role === 'admin';
  }

  if (!user?.id || !initialIsAdmin) {
    redirect('/');
  }

  if (user?.id && initialIsAdmin) {
    try {
      initialUsers = await getAllUsersServer();
    } catch (error) {
      console.error('Error loading users (server):', error);
    }
  }

  return (
    <AdminUsersClient
      initialUserId={user?.id ?? null}
      initialIsAdmin={initialIsAdmin}
      initialUsers={initialUsers}
    />
  );
}
