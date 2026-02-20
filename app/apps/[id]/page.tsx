import AppDetailClient from './AppDetailClient';
import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AppDetailPage({ params }: PageProps) {
  const { id } = await params;
  const client = await getServerClient();
  const [app, comments] = await Promise.all([
    db.apps.getById(client, id),
    db.comments.getByTarget(client, id, 'app'),
  ]);

  if (!app) {
    notFound();
  }

  return <AppDetailClient initialApp={app} initialComments={comments} />;
}
