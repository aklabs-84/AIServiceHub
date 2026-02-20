import AppsClient from './AppsClient';
import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AppsPage() {
  const client = await getServerClient();
  const apps = await db.apps.getAll(client);

  return <AppsClient initialApps={apps} />;
}
