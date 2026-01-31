import LikedAppsClient from './LikedAppsClient';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { getLikedAppsByUserServer } from '@/lib/dbServer';
import type { AIApp } from '@/types/app';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LikedAppsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  let initialApps: AIApp[] = [];

  if (user?.id) {
    try {
      initialApps = await getLikedAppsByUserServer(user.id);
    } catch (error) {
      console.error('Error loading liked apps (server):', error);
    }
  }

  return <LikedAppsClient initialUserId={user?.id ?? null} initialApps={initialApps} />;
}
