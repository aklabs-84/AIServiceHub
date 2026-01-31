import AdminClient from './AdminClient';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  getAllAppsServer,
  getAllPromptsServer,
  getAllCommentsServer,
  getAllUsersServer,
  getCategoriesByTypeServer,
} from '@/lib/dbServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AdminClient
        initialUserId={null}
        initialIsAdmin={false}
        initialApps={[]}
        initialPrompts={[]}
        initialComments={[]}
        initialUsers={[]}
        initialAppCategories={[]}
        initialPromptCategories={[]}
        initialDataLoaded={true}
      />
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    return (
      <AdminClient
        initialUserId={user.id}
        initialIsAdmin={false}
        initialApps={[]}
        initialPrompts={[]}
        initialComments={[]}
        initialUsers={[]}
        initialAppCategories={[]}
        initialPromptCategories={[]}
        initialDataLoaded={true}
      />
    );
  }

  const [apps, prompts, comments, users, appCategories, promptCategories] = await Promise.all([
    getAllAppsServer(),
    getAllPromptsServer(),
    getAllCommentsServer(),
    getAllUsersServer(),
    getCategoriesByTypeServer('app'),
    getCategoriesByTypeServer('prompt'),
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
