import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';

// ── Notion 클라이언트 (서버 전용) ───────────────────────────────
function getNotionClient() {
  const key = process.env.NOTION_API_KEY;
  if (!key) throw new Error('NOTION_API_KEY 환경변수가 설정되지 않았습니다.');
  return new Client({ auth: key });
}

// ── Notion URL → Page ID 추출 ───────────────────────────────────
// 지원 형식:
//   https://www.notion.so/Page-Title-{32hex}
//   https://www.notion.so/{workspace}/Page-Title-{32hex}
//   https://{workspace}.notion.site/{32hex}
//   https://www.notion.so/{32hex-with-dashes}
export function extractNotionPageId(url: string): string | null {
  try {
    const { hostname, pathname } = new URL(url);
    if (!hostname.includes('notion')) return null;

    // 경로 맨 끝 세그먼트에서 32자리 hex 추출
    const segments = pathname.split('/').filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      // UUID 형식(하이픈 포함): xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidMatch = seg.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (uuidMatch) return uuidMatch[1];
      // 마지막 32자리 hex (제목 뒤에 붙는 경우)
      const hexMatch = seg.match(/([0-9a-f]{32})$/i);
      if (hexMatch) return hexMatch[1];
    }
    return null;
  } catch {
    return null;
  }
}

// ── Notion 여부 판별 ────────────────────────────────────────────
export function isNotionUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname.includes('notion.so') || hostname.includes('notion.site');
  } catch {
    return false;
  }
}

// ── 페이지 메타 (제목) 가져오기 ─────────────────────────────────
export async function getNotionPageTitle(pageId: string): Promise<string> {
  try {
    const notion = getNotionClient();
    const page = await notion.pages.retrieve({ page_id: pageId });
    // properties.title 또는 Name
    const props = (page as any).properties;
    for (const key of ['title', 'Title', 'Name', '이름', '제목']) {
      const prop = props?.[key];
      if (prop?.title?.[0]?.plain_text) return prop.title[0].plain_text;
    }
    return '노션 페이지';
  } catch {
    return '노션 페이지';
  }
}

// ── 페이지 내용 → Markdown 변환 ────────────────────────────────
export async function notionPageToMarkdown(pageId: string): Promise<string> {
  const notion = getNotionClient();
  const n2m = new NotionToMarkdown({ notionClient: notion });

  const mdBlocks = await n2m.pageToMarkdown(pageId);
  const { parent } = n2m.toMarkdownString(mdBlocks);
  return parent;
}
