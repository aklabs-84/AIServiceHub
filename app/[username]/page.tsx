import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/database/client';
import { db } from '@/lib/database';
import { getServerClient } from '@/lib/database/server';
import PublicVibeSpace from './PublicVibeSpace';
import MyPageClient from '@/app/my/MyPageClient';

export const dynamic = 'force-dynamic';

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);

  const admin = getAdminClient();
  const serverClient = await getServerClient();

  // 1. 해당 username의 프로필 조회
  const { data: profileData, error } = await admin
    .from('profiles')
    .select('id, display_name, avatar_url, username, cover_image_url')
    .eq('username', decoded)
    .maybeSingle();

  if (error) {
    console.error('[username] profile query error:', error.message, '| username:', decoded);
    return notFound();
  }
  if (!profileData) return notFound();

  // 2. 로그인 유저 확인
  const { data: { user: currentUser } } = await serverClient.auth.getUser();
  const isOwner = currentUser?.id === profileData.id;

  if (isOwner) {
    // 본인 페이지 → 전체 데이터 로드 후 MyPageClient 렌더링
    const [myApps, myPrompts, likedApps, likedPrompts] = await Promise.all([
      db.apps.getByUser(serverClient, profileData.id),
      db.prompts.getByUser(serverClient, profileData.id),
      db.apps.getLikedByUser(serverClient, profileData.id),
      db.prompts.getLikedByUser(serverClient, profileData.id),
    ]);

    return (
      <MyPageClient
        initialUserId={profileData.id}
        initialProfile={{ username: profileData.username ?? decoded, coverImageUrl: profileData.cover_image_url ?? null }}
        initialMyApps={myApps}
        initialMyPrompts={myPrompts}
        initialLikedApps={likedApps}
        initialLikedPrompts={likedPrompts}
      />
    );
  }

  // 3. 타인 페이지 → 공개 데이터만
  const [publicApps, publicPrompts] = await Promise.all([
    db.apps.getByUser(serverClient, profileData.id).then(apps => apps.filter(a => a.isPublic)),
    db.prompts.getByUser(serverClient, profileData.id).then(prompts => prompts.filter(p => p.isPublic)),
  ]);

  const profile = {
    id: profileData.id,
    username: profileData.username ?? decoded,
    displayName: profileData.display_name ?? decoded,
    avatarUrl: profileData.avatar_url ?? null,
    coverImageUrl: profileData.cover_image_url ?? null,
  };

  return (
    <PublicVibeSpace
      profile={profile}
      publicApps={publicApps}
      publicPrompts={publicPrompts}
    />
  );
}
