import MyPageClient from './MyPageClient';
import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MyPage() {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    return (
      <MyPageClient
        initialUserId={null}
        initialMyApps={[]}
        initialMyPrompts={[]}
        initialLikedApps={[]}
        initialLikedPrompts={[]}
      />
    );
  }

  const [myApps, myPrompts, likedApps, likedPrompts] = await Promise.all([
    db.apps.getByUser(client, user.id),
    db.prompts.getByUser(client, user.id),
    db.apps.getLikedByUser(client, user.id),
    db.prompts.getLikedByUser(client, user.id),
  ]);

  return (
    <MyPageClient
      initialUserId={user.id}
      initialMyApps={myApps}
      initialMyPrompts={myPrompts}
      initialLikedApps={likedApps}
      initialLikedPrompts={likedPrompts}
    />
  );
}
