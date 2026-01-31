import MyPageClient from './MyPageClient';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  getAppsByUserServer,
  getLikedAppsByUserServer,
  getLikedPromptsByUserServer,
  getPromptsByUserServer,
} from '@/lib/dbServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MyPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    getAppsByUserServer(user.id),
    getPromptsByUserServer(user.id),
    getLikedAppsByUserServer(user.id),
    getLikedPromptsByUserServer(user.id),
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
