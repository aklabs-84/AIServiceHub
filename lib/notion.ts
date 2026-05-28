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

// ── 파일/PDF 블록 → Markdown 링크 변환 ──────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fileBlockToMarkdown(fileInfo: any): string {
  if (!fileInfo) return '';
  const rawName: string = fileInfo?.name ?? '';
  const url: string =
    fileInfo?.type === 'file'
      ? (fileInfo?.file?.url ?? '')
      : (fileInfo?.external?.url ?? '');
  if (!url) return '';
  const nameFromUrl = decodeURIComponent(url.split('?')[0].split('/').pop() ?? '');
  const filename = rawName || nameFromUrl || '첨부파일';
  return `[📎 ${filename}](${url})`;
}

// ── 연속 코드블록 사이 빈 줄 보정 ───────────────────────────────
// notion-to-md가 코드 펜스 사이에 \n만 넣는 경우가 있어 \n\n으로 교정.
// 처리 대상:
//   1) 닫는 펜스(```) 바로 뒤에 여는 펜스(```)가 오는 경우
//   2) 코드블록이 아닌 일반 내용 뒤에 바로 여는 펜스(```)가 오는 경우 (bookmark 등)
function fixCodeBlockSeparation(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);

    const cur = lines[i];
    const next = lines[i + 1] ?? '';

    // 현재 줄이 닫는 펜스(공백 없는 ```) 이고 다음 줄이 여는 펜스인 경우
    if (cur.trim() === '```' && next.startsWith('```')) {
      out.push('');
      continue;
    }

    // 현재 줄이 비어있지 않고, 코드 펜스가 아니며
    // 다음 줄이 여는 코드 펜스인 경우 (bookmark → code block 등)
    if (
      cur.trim() !== '' &&
      !cur.trimStart().startsWith('```') &&
      next.startsWith('```')
    ) {
      out.push('');
    }
  }

  return out.join('\n');
}

// ── 페이지 내용 → Markdown 변환 ────────────────────────────────
export async function notionPageToMarkdown(pageId: string): Promise<string> {
  const notion = getNotionClient();
  const n2m = new NotionToMarkdown({ notionClient: notion });

  // ── 코드 블록 ──
  // notion-to-md 는 언어를 Notion API 그대로 쓰는데, 일반 텍스트 코드는
  // "plain text"(공백 포함) 로 내려와 remark 가 언어 태그로 오인할 수 있음.
  // 언어 없음으로 정규화하고, 블록 경계를 명확히 \n\n 으로 구분.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  n2m.setCustomTransformer('code', async (block: any) => {
    const rawLang: string = block?.code?.language ?? '';
    // "plain text", "plaintext", "plain_text" → 언어 없음
    const lang = /^plain[\s_-]?text$/i.test(rawLang.trim()) ? '' : rawLang.trim();
    const text: string = (block?.code?.rich_text ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((t: any) => t.plain_text ?? '')
      .join('');
    return `\`\`\`${lang}\n${text}\n\`\`\``;
  });

  // ── 토글 블록 ──
  // 자식 블록들을 재귀적으로 마크다운 변환 후 <details>/<summary> HTML로 감쌈.
  // MarkdownRenderer 에 rehype-raw 가 있어야 실제 HTML로 렌더링됨.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  n2m.setCustomTransformer('toggle', async (block: any) => {
    const richText: string = (block?.toggle?.rich_text ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((t: any) => t.plain_text ?? '')
      .join('');
    try {
      const childBlocks = await n2m.pageToMarkdown(block.id);
      const { parent: childMd } = n2m.toMarkdownString(childBlocks);
      const inner = childMd.trim();
      if (!inner) {
        return `<details>\n<summary>${richText}</summary>\n</details>`;
      }
      return `<details>\n<summary>${richText}</summary>\n\n${inner}\n\n</details>`;
    } catch {
      // 자식 fetch 실패 시 제목만 표시
      return `<details>\n<summary>${richText}</summary>\n</details>`;
    }
  });

  // ── 테이블 블록 ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  n2m.setCustomTransformer('table', async (block: any) => {
    const hasColumnHeader = block?.table?.has_column_header ?? false;
    return tableBlockToMarkdown(notion, block.id, hasColumnHeader);
  });

  // ── 첨부파일 블록 ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  n2m.setCustomTransformer('file', async (block: any) => {
    return fileBlockToMarkdown(block?.file);
  });

  // ── PDF 블록 ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  n2m.setCustomTransformer('pdf', async (block: any) => {
    return fileBlockToMarkdown(block?.pdf);
  });

  // ── 북마크 블록 ──
  // notion-to-md 기본 변환기 없음 → 직접 처리
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  n2m.setCustomTransformer('bookmark', async (block: any) => {
    const url: string = block?.bookmark?.url ?? '';
    if (!url) return '';
    // 캡션이 있으면 캡션을 라벨로, 없으면 URL 그대로 표시
    const caption: string = (block?.bookmark?.caption ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((t: any) => t.plain_text ?? '')
      .join('')
      .trim();
    const label = caption || url;
    return `[🔖 ${label}](${url})`;
  });

  const mdBlocks = await n2m.pageToMarkdown(pageId);
  const { parent } = n2m.toMarkdownString(mdBlocks);

  // 연속 코드블록 분리 보정
  return fixCodeBlockSeparation(parent);
}
