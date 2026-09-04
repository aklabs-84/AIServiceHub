import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';
import type { Prompt } from '@/types/database';

export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
  const key = request.headers.get('x-api-key');
  const expected = process.env.PUBLIC_API_KEY;
  return !!expected && key === expected;
}

// 유료 프롬프트는 사이트에서도 결제 전엔 promptContent를 감추므로(app/api/prompts/[id]/content),
// 여기서도 무료 프롬프트만 실제 내용을 내보낸다.
function serializePrompt(prompt: Prompt) {
  return {
    id: prompt.id,
    name: prompt.name,
    description: prompt.description,
    category: prompt.category,
    tags: prompt.tags,
    thumbnailUrl: prompt.thumbnailUrl,
    promptContent: !prompt.isPaid ? prompt.promptContent : null,
    price: prompt.price,
    isPaid: prompt.isPaid,
    likeCount: prompt.likeCount,
    createdAt: prompt.createdAt,
  };
}

// GET /api/public/prompts?category=&tag=&limit=&offset=
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const tag = searchParams.get('tag') || undefined;
  const limit = Number(searchParams.get('limit')) || undefined;
  const offset = Number(searchParams.get('offset')) || undefined;

  const admin = getAdminClient();
  const prompts = await db.prompts.getPublicList(admin, { category, tag, limit, offset });

  return NextResponse.json({ prompts: prompts.map(serializePrompt) });
}
