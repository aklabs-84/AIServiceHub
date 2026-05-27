import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';

// ── Notion 클라이언트 (서버 전용) ───────────────────────────────
function getNotionClient() {
  const key = process.env.NOTION_API_KEY;
  if (!key) throw new Error('NOTION_API_KEY 환경변수가 설정되지 않았습니다.');
  return new Client({ auth: key });
}

// ── Notion URL → Page ID 추출 ───────────────────────────────────
export function extractNotionPageId(url: string): string | null {
  try {
    const { hostname, pathname } = new URL(url);
    if (!hostname.includes('notion')) return null;

    const segments = pathname.split('/').filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      const uuidMatch = seg.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (uuidMatch) return uuidMatch[1];
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ── 테이블 블록 → GFM Markdown 변환 ────────────────────────────
async function tableBlockToMarkdown(
  notion: Client,
  blockId: string,
  hasColumnHeader: boolean
): Promise<string> {
  try {
    const { results } = await notion.blocks.children.list({ block_id: blockId });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = results.filter((b: any) => b.type === 'table_row') as any[];

    if (rows.length === 0) return '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parseCell = (cell: any[]): string =>
      (cell ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => (t.plain_text ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' '))
        .join('')
        .trim() || ' ';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rowToMd = (row: any): string => {
      const cells: unknown[][] = row.table_row?.cells ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return '| ' + cells.map((c: any) => parseCell(c)).join(' | ') + ' |';
    };

    const colCount: number = rows[0].table_row?.cells?.length ?? 1;
    const separator = '| ' + Array(colCount).fill('---').join(' | ') + ' |';
    const markdownRows = rows.map(rowToMd);

    if (hasColumnHeader) {
      return [markdownRows[0], separator, ...markdownRows.slice(1)].join('\n');
    } else {
      const emptyHeader = '| ' + Array(colCount).fill(' ').join(' | ') + ' |';
      return [emptyHeader, separator, ...markdownRows].join('\n');
    }
  } catch (err) {
    console.error('[notion/table] 변환 오류:', err);
    return '';
  }
}

// ── 파일 블록 → Markdown 링크 변환 ────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fileBlockToMarkdown(fileInfo: any): string {
  if (!fileInfo) return '';

  // 파일명: name 필드 우선, 없으면 URL에서 추출
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawName: string = fileInfo?.name || '';
  const url: string =
    fileInfo?.type === 'file'
      ? (fileInfo?.file?.url ?? '')
      : (fileInfo?.external?.url ?? '');

  if (!url) return '';

  // URL에서 파일명 추출 (S3 signed URL 등은 경로 마지막 세그먼트 사용)
  const nameFromUrl = decodeURIComponent(url.split('?')[0].split('/').pop() ?? '');
  const filename = rawName || nameFromUrl || '첨부파일';

  return `[📎 ${filename}](${url})`;
}

// ── 페이지 내용 → Markdown 변환 ────────────────────────────────
export async function notionPageToMarkdown(pageId: string): Promise<string> {
  const notion = getNotionClient();
  const n2m = new NotionToMarkdown({ notionClient: notion });

  // ── 테이블 블록 변환기 ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  n2m.setCustomTransformer('table', async (block: any) => {
    const hasColumnHeader = block?.table?.has_column_header ?? false;
    return tableBlockToMarkdown(notion, block.id, hasColumnHeader);
  });

  // ── 첨부파일(file) 블록 변환기 ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  n2m.setCustomTransformer('file', async (block: any) => {
    return fileBlockToMarkdown(block?.file);
  });

  // ── PDF 블록 변환기 ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  n2m.setCustomTransformer('pdf', async (block: any) => {
    return fileBlockToMarkdown(block?.pdf);
  });

  const mdBlocks = await n2m.pageToMarkdown(pageId);
  const { parent } = n2m.toMarkdownString(mdBlocks);

  // ── 연속 코드블록 사이 빈 줄 보정 ──
  // notion-to-md가 코드 펜스 사이에 \n만 넣는 경우 \n\n으로 교정
  const fixedMarkdown = parent.replace(/```\n```/g, '```\n\n```');

  return fixedMarkdown;
}
