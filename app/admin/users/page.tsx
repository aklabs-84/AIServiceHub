import AdminUsersClient from './AdminUsersClient';
import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import type { UserProfile } from '@/types/database';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminUsersPage() {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  let initialUsers: UserProfile[] = [];
  let initialIsAdmin = false;

  if (user?.id) {
    const { data: profile } = await client
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
      initialUsers = await db.auth.getAllUsers(client);
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
