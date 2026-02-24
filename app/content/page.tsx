import ContentClient from './ContentClient';
import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import type { Post } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ContentPage() {
  const client = await getServerClient();
  let posts: Post[] = [];
  try {
    posts = await db.posts.getAll(client);
  } catch {
    // posts 테이블이 아직 없을 수 있음
  }
  return <ContentClient initialPosts={posts} />;
}
