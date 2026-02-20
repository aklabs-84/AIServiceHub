import MyAppsClient from './MyAppsClient';
import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import type { AIApp } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MyAppsPage() {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  let initialApps: AIApp[] = [];

  if (user?.id) {
    try {
      initialApps = await db.apps.getByUser(client, user.id);
    } catch (error) {
      console.error('Error loading my apps (server):', error);
    }
  }

  return <MyAppsClient initialUserId={user?.id ?? null} initialApps={initialApps} />;
}
