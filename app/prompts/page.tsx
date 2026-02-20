import PromptsClient from './PromptsClient';
import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PromptsPage() {
  const client = await getServerClient();
  const prompts = await db.prompts.getAll(client);

  return <PromptsClient initialPrompts={prompts} />;
}
