import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';

type CreatePromptPayload = {
  name: string;
  description: string;
  promptContent: string;
  category: string;
  isPublic: boolean;
  thumbnailUrl?: string;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  createdByName: string;
  tags?: string[];
  snsUrls?: string[];
};

const getAccessToken = (req: NextRequest) => {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
};

export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    if (!accessToken) {
      return NextResponse.json({ error: '인증 토큰이 없습니다.' }, { status: 401 });
    }

    const admin = getAdminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: '유효하지 않은 세션입니다.' }, { status: 401 });
    }

    const body = (await req.json()) as CreatePromptPayload;
    if (!body?.name || !body?.description || !body?.promptContent || !body?.category) {
      return NextResponse.json({ error: '필수 입력값이 누락되었습니다.' }, { status: 400 });
    }

    const payload = {
      name: body.name,
      description: body.description,
      prompt_content: body.promptContent,
      sns_urls: body.snsUrls ?? [],
      category: body.category,
      is_public: body.isPublic ?? true,
      thumbnail_url: body.thumbnailUrl,
      thumbnail_pos: {
        x: body.thumbnailPositionX ?? 50,
        y: body.thumbnailPositionY ?? 50,
      },
      tags: body.tags ?? [],
      created_by: userData.user.id,
      created_by_name: body.createdByName,
    };

    const { data, error } = await admin
      .from('prompts')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error('[API] create prompt error:', error);
    return NextResponse.json({ error: '프롬프트 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
