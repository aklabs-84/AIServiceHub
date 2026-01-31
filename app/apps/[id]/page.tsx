import AppDetailClient from './AppDetailClient';
import { getAppByIdServer, getCommentsServer } from '@/lib/dbServer';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AppDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [app, comments] = await Promise.all([
    getAppByIdServer(id),
    getCommentsServer(id, 'app'),
  ]);

  if (!app) {
    notFound();
  }

  return <AppDetailClient initialApp={app} initialComments={comments} />;
}
