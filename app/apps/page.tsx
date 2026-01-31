import AppsClient from './AppsClient';
import { getAllAppsServer } from '@/lib/dbServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AppsPage() {
  const apps = await getAllAppsServer();

  return <AppsClient initialApps={apps} />;
}
