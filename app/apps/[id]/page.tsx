import type { Metadata } from 'next';
import AppDetailClient from './AppDetailClient';
import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_URL = 'https://ai-service-hub.vercel.app';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const client = await getServerClient();
  const app = await db.apps.getById(client, id);

  if (!app) {
    return { title: '아크의실험실 - 앱을 찾을 수 없습니다' };
  }

  const title = `${app.name} | 아크의실험실`;
  const description = app.description || `${app.name}: 아크의실험실 바이브코딩 연구소에서 만든 AI 앱`;
  const image = app.thumbnailUrl || `${BASE_URL}/ai-labs-og.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/apps/${id}`,
      images: [{ url: image, width: 1200, height: 630, alt: app.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: app.name,
    description: app.description || `${app.name}: 아크의실험실 바이브코딩 연구소에서 만든 AI 앱`,
    url: `${BASE_URL}/apps/${app.id}`,
    applicationCategory: 'WebApplication',
    operatingSystem: 'Web',
    author: {
      '@type': 'Organization',
      name: '아크의실험실',
      url: BASE_URL,
    },
    ...(app.thumbnailUrl && { image: app.thumbnailUrl }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AppDetailClient initialApp={app} initialComments={comments} />
    </>
  );
}
