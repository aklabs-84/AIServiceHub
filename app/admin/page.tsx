import AdminClient from './AdminClient';
import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPage() {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/');
  }

  const [apps, prompts, comments, users, appCategories, promptCategories] = await Promise.all([
    db.apps.getAll(client),
    db.prompts.getAll(client),
    db.comments.getAll(client),
    db.auth.getAllUsers(client),
    db.categories.getByType(client, 'app'),
    db.categories.getByType(client, 'prompt'),
  ]);

  return (
    <AdminClient
      initialUserId={user.id}
      initialIsAdmin
      initialApps={apps}
      initialPrompts={prompts}
      initialComments={comments}
      initialUsers={users}
      initialAppCategories={appCategories}
      initialPromptCategories={promptCategories}
      initialDataLoaded
    />
  );
}
