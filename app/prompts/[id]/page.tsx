import PromptDetailClient from './PromptDetailClient';
import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PromptDetailPage({ params }: PageProps) {
  const { id } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    notFound();
  }

  const client = await getServerClient();
  const [prompt, comments] = await Promise.all([
    db.prompts.getById(client, id),
    db.comments.getByTarget(client, id, 'prompt'),
  ]);

  if (!prompt) {
    notFound();
  }

  return <PromptDetailClient initialPrompt={prompt} initialComments={comments} />;
}
