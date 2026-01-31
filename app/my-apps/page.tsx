import MyAppsClient from './MyAppsClient';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { getAppsByUserServer } from '@/lib/dbServer';
import type { AIApp } from '@/types/app';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MyAppsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  let initialApps: AIApp[] = [];

  if (user?.id) {
    try {
      initialApps = await getAppsByUserServer(user.id);
    } catch (error) {
      console.error('Error loading my apps (server):', error);
    }
  }

  return <MyAppsClient initialUserId={user?.id ?? null} initialApps={initialApps} />;
}
