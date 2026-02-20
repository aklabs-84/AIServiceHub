import LikedAppsClient from './LikedAppsClient';
import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import type { AIApp } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LikedAppsPage() {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  let initialApps: AIApp[] = [];

  if (user?.id) {
    try {
      initialApps = await db.apps.getLikedByUser(client, user.id);
    } catch (error) {
      console.error('Error loading liked apps (server):', error);
    }
  }

  return <LikedAppsClient initialUserId={user?.id ?? null} initialApps={initialApps} />;
}
