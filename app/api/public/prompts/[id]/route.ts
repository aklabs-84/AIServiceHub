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

// GET /api/public/prompts/:id
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const admin = getAdminClient();
  const prompt = await db.prompts.getPublicById(admin, id);
  if (!prompt) {
    return NextResponse.json({ error: '프롬프트를 찾을 수 없습니다' }, { status: 404 });
  }

  return NextResponse.json({ prompt: serializePrompt(prompt) });
}
