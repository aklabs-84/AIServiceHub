import { redirect } from 'next/navigation';
import MyPageClient from './MyPageClient';
import { getServerClient } from '@/lib/database/server';
import { getAdminClient } from '@/lib/database/client';
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
        initialProfile={null}
        initialMyApps={[]}
        initialMyPrompts={[]}
        initialLikedApps={[]}
        initialLikedPrompts={[]}
      />
    );
  }

  const [myApps, myPrompts, likedApps, likedPrompts, profileResult] = await Promise.all([
    db.apps.getByUser(client, user.id),
    db.prompts.getByUser(client, user.id),
    db.apps.getLikedByUser(client, user.id),
    db.prompts.getLikedByUser(client, user.id),
    client.from('profiles').select('username, cover_image_url').eq('id', user.id).maybeSingle(),
  ]);

  let username = profileResult.data?.username ?? null;

  // username이 없으면 email prefix로 자동 생성 후 admin client로 저장
  if (!username && user.email) {
    const admin = getAdminClient();
    const base = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    let candidate = base;
    let suffix = 1;
    // 현재 유저 제외하고 충돌 없을 때까지 후보 확정
    while (true) {
      const { data: existing } = await admin
        .from('profiles')
        .select('id')
        .eq('username', candidate)
        .neq('id', user.id)
        .maybeSingle();
      if (!existing) break;
      candidate = `${base}${suffix++}`;
    }
    const { error: updateError } = await admin
      .from('profiles')
      .update({ username: candidate })
      .eq('id', user.id);
    if (!updateError) username = candidate;
  }

  // username이 있으면 /{username}으로 redirect
  if (username) {
    redirect(`/${username}`);
  }

  const profile = {
    username: username ?? null,
    coverImageUrl: profileResult.data?.cover_image_url ?? null,
  };

  return (
    <MyPageClient
      initialUserId={user.id}
      initialProfile={profile}
      initialMyApps={myApps}
      initialMyPrompts={myPrompts}
      initialLikedApps={likedApps}
      initialLikedPrompts={likedPrompts}
    />
  );
}
