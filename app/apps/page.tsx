import AppsClient from './AppsClient';
import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AppsPage() {
  const client = await getServerClient();
  const [apps, collections] = await Promise.all([
    db.apps.getAll(client),
    db.collections.getPublished(client).catch(() => []),
  ]);

  return <AppsClient initialApps={apps} initialCollections={collections} />;
}
