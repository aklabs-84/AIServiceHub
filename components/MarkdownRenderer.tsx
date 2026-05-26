'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
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
      return (
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 overflow-x-auto my-4">
          <code className="text-sm font-mono text-gray-800 dark:text-gray-200">{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-gray-100 dark:bg-gray-800 text-sm font-mono px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200">{children}</code>
    );
  },
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
