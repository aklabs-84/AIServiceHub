import ContentClient from './ContentClient';
import { getAllAppsServer } from '@/lib/dbServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ContentPage() {
  const apps = await getAllAppsServer();
  return <ContentClient initialApps={apps} />;
}
