import PromptDetailClient from './PromptDetailClient';
import { getServerClient } from '@/lib/database/server';
import { getAdminClient } from '@/lib/database';
import { db } from '@/lib/database';
import { purchases } from '@/lib/database/purchases';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mosebb@gmail.com';

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

  // ── 유료 프롬프트 보안: HTML 소스에 본문 미포함 ──────────────────────────
  // 서버에서 사용자 세션 확인 후 미구매자에게는 promptContent를 '' 으로 치환.
  // 실제 본문은 클라이언트에서 /api/prompts/[id]/content 를 통해 fetch.
  if (prompt.isPaid && prompt.price > 0) {
    const { data: { user } } = await client.auth.getUser();
    let hasAccess = false;

    if (user) {
      if (user.email === ADMIN_EMAIL) {
        hasAccess = true;
      } else {
        const admin = getAdminClient();
        hasAccess = await purchases.canAccess(admin, user.id, 'prompt', id);
      }
    }

    if (!hasAccess) {
      // HTML 소스에서 본문 내용 제거 (보안 핵심)
      prompt.promptContent = '';
    }
  }

  return <PromptDetailClient initialPrompt={prompt} initialComments={comments} />;
}
