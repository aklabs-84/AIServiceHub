'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { FaCopy, FaCheck } from 'react-icons/fa';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

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

// ── 블록 코드 (언어 클래스가 있는 경우) ──────────────────────
function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
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
        <code className={`text-sm font-mono text-gray-800 dark:text-gray-200 ${className ?? ''}`}>
          {children}
        </code>
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
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    // 인라인 코드
    return (
      <code className="bg-gray-100 dark:bg-gray-800 text-sm font-mono px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200">
        {children}
      </code>
    );
  },
  // pre는 CodeBlock 안에서 직접 렌더링하므로 여기선 그냥 통과
  pre: ({ children }) => <>{children}</>,
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} className="rounded-xl max-w-full my-4" />
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 underline hover:opacity-80 transition-opacity">{children}</a>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>
  ),
  hr: () => <hr className="my-6 border-gray-200 dark:border-gray-700" />,
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
