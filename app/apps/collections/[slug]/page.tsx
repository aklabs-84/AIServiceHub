import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import CollectionDetailClient from './CollectionDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const client = await getServerClient();
  const collection = await db.collections.getBySlug(client, slug);
  if (!collection) return { title: '컬렉션을 찾을 수 없습니다' };
  return {
    title: collection.title,
    description: collection.description,
  };
}

export default async function CollectionDetailPage({ params }: Props) {
  const { slug } = await params;
  const client = await getServerClient();
  const collection = await db.collections.getBySlug(client, slug);

  if (!collection || !collection.isPublished) {
    notFound();
  }

  // 컬렉션에 포함된 앱들 조회
  const allApps = collection.appIds.length > 0 ? await db.apps.getAll(client) : [];
  const featuredApps = collection.appIds
    .map((id) => allApps.find((a) => a.id === id))
    .filter(Boolean) as Awaited<ReturnType<typeof db.apps.getAll>>;

  return (
    <CollectionDetailClient
      collection={collection}
      featuredApps={featuredApps}
    />
  );
}
