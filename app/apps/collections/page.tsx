import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import CollectionListClient from './CollectionListClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CollectionsPage() {
  const client = await getServerClient();
  const collections = await db.collections.getAll(client).catch(() => []);

  // Filter for published collections if the user might not be an admin, 
  // but usually we fetch all for admins and filter on client or fetch separate.
  // For now, let's fetch ALL collections since admins need to see even unpublished ones to edit them.
  // The client side logic already handles what to show.

  return <CollectionListClient initialCollections={collections} />;
}
