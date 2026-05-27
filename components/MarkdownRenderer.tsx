'use client';

import { useState, useContext, createContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { FaCopy, FaCheck, FaDownload } from 'react-icons/fa';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// ── pre 블록 컨텍스트 (인라인 코드 vs 블록 코드 구분) ────────
const InsidePreContext = createContext(false);

// ── 코드 내용 추출 (React 노드 → 순수 문자열) ─────────────────
function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node !== null && typeof node === 'object' && 'props' in (node as object)) {
    const el = node as { props?: { children?: React.ReactNode } };
    return extractText(el.props?.children);
  }
  return '';
}

// ── 블록 코드 래퍼 (pre + 복사 버튼) ──────────────────────────
function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = extractText(children);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API 미지원 환경 무시
    }
  };

  return (
    <div className="relative group my-4">
      <pre className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 overflow-x-auto">
        {children}
      </pre>
      {/* 호버 시 우상단 복사 버튼 */}
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold
          bg-gray-200/80 dark:bg-gray-700/80 backdrop-blur-sm
          text-gray-500 dark:text-gray-300
          opacity-0 group-hover:opacity-100
          hover:bg-gray-300 dark:hover:bg-gray-600
          transition-all duration-150 select-none"
        title="코드 복사"
      >
        {copied ? (
          <>
            <FaCheck className="text-emerald-500 text-[10px]" />
            <span className="text-emerald-500">복사됨</span>
          </>
        ) : (
          <>
            <FaCopy className="text-[10px]" />
            <span>복사</span>
          </>
        )}
      </button>
    </div>
  );
}

// ── code 컴포넌트: InsidePreContext로 블록/인라인 자동 구분 ─────
function CodeComponent({ children, className }: { children?: React.ReactNode; className?: string }) {
  const insidePre = useContext(InsidePreContext);

  if (insidePre) {
    // 블록 코드 — CodeBlock 안에 위치, pre는 CodeBlock이 렌더링
    return (
      <code className={`text-sm font-mono text-gray-800 dark:text-gray-200 ${className ?? ''}`}>
        {children}
      </code>
    );
  }

  // 인라인 코드
  return (
    <code className="bg-gray-100 dark:bg-gray-800 text-sm font-mono px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200">
      {children}
    </code>
  );
}

const components: Components = {
  p: ({ children }) => (
    <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300 last:mb-0">{children}</p>
  ),
  h1: ({ children }) => (
    <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-8 mb-4 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-black text-gray-900 dark:text-white mt-6 mb-3 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-5 mb-2 first:mt-0">{children}</h3>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-4 space-y-1 text-gray-700 dark:text-gray-300">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-4 space-y-1 text-gray-700 dark:text-gray-300">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-violet-400 dark:border-violet-600 pl-4 my-4 text-gray-500 dark:text-gray-400 italic">{children}</blockquote>
  ),
  // pre → InsidePreContext 주입 + CodeBlock 래핑 (언어 없는 코드블록도 처리)
  pre: ({ children }) => (
    <InsidePreContext.Provider value={true}>
      <CodeBlock>{children}</CodeBlock>
    </InsidePreContext.Provider>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: CodeComponent as any,
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} className="rounded-xl max-w-full my-4" />
  ),
  a: ({ href, children }) => {
    const text = extractText(children as React.ReactNode);
    // 📎로 시작하는 링크 → 파일 다운로드 카드
    if (text.startsWith('📎')) {
      const filename = text.replace(/^📎\s*/, '') || '파일 다운로드';
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 px-3.5 py-2.5 my-1 rounded-xl
            border border-gray-200 dark:border-gray-700
            bg-gray-50 dark:bg-gray-800/60
            text-sm font-bold text-gray-700 dark:text-gray-200
            hover:border-violet-400 dark:hover:border-violet-600
            hover:bg-violet-50 dark:hover:bg-violet-900/20
            hover:text-violet-700 dark:hover:text-violet-300
            transition-all no-underline group max-w-full"
        >
          <span className="text-base flex-none">📎</span>
          <span className="truncate">{filename}</span>
          <FaDownload className="text-xs text-gray-400 group-hover:text-violet-500 transition-colors flex-none" />
        </a>
      );
    }
    // 일반 링크
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 underline hover:opacity-80 transition-opacity">
        {children}
      </a>
    );
  },
  strong: ({ children }) => (
    <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>
  ),
  hr: () => <hr className="my-6 border-gray-200 dark:border-gray-700" />,

  // ── 테이블 ──────────────────────────────────────────────────
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-50 dark:bg-gray-800/70">{children}</thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{children}</tbody>,
  tr: ({ children }) => (
    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800/60 last:border-b-0">
      {children}
    </td>
  ),
};

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
