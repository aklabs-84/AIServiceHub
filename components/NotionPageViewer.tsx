'use client';

import { useEffect, useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { FaExternalLinkAlt, FaChevronDown, FaChevronUp, FaSyncAlt } from 'react-icons/fa';
import { SiNotion } from 'react-icons/si';

interface Props {
  url: string;
  title?: string;          // material 제목 (없으면 API로 가져옴)
  defaultOpen?: boolean;
  showExternalLink?: boolean; // 외부 링크 버튼 표시 여부 (기본 false)
}

type Status = 'idle' | 'loading' | 'done' | 'error';

export default function NotionPageViewer({ url, title: propTitle, defaultOpen = false, showExternalLink = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [status, setStatus] = useState<Status>('idle');
  const [markdown, setMarkdown] = useState('');
  const [pageTitle, setPageTitle] = useState(propTitle || '');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchContent = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/notion/page?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || '페이지를 불러오지 못했습니다.');
        setStatus('error');
        return;
      }
      setMarkdown(data.markdown);
      if (!propTitle && data.title) setPageTitle(data.title);
      setStatus('done');
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  // 처음 펼칠 때 fetch
  const handleToggle = () => {
    if (!open && status === 'idle') fetchContent();
    setOpen(v => !v);
  };

  // defaultOpen이면 마운트 시 바로 fetch
  useEffect(() => {
    if (defaultOpen && status === 'idle') fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all">
      {/* 헤더 — 항상 표시 */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left"
      >
        {/* Notion 로고 */}
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-none">
          <SiNotion className="text-lg text-gray-700 dark:text-gray-200" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
            {pageTitle || '노션 페이지'}
          </p>
          {showExternalLink && (
            <p className="text-xs text-gray-400 truncate">{url}</p>
          )}
        </div>

        {/* 외부 링크 — 관리자만 표시 */}
        {showExternalLink && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-none"
            title="노션에서 열기"
          >
            <FaExternalLinkAlt className="text-xs text-gray-400" />
          </a>
        )}

        {/* 펼치기/접기 */}
        <div className="flex-none text-gray-400">
          {open ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
        </div>
      </button>

      {/* 콘텐츠 영역 */}
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* 로딩 */}
          {status === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
              <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">노션 페이지 불러오는 중...</span>
            </div>
          )}

          {/* 에러 */}
          {status === 'error' && (
            <div className="p-6 space-y-3">
              <p className="text-sm text-red-500 dark:text-red-400">{errorMsg}</p>
              {errorMsg.includes('Integration') && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <p className="font-bold">📋 해결 방법</p>
                  <p>1. 노션에서 해당 페이지를 열어주세요</p>
                  <p>2. 우상단 ••• 메뉴 → Connections → Integration 연결</p>
                  <p>3. 아래 새로고침 버튼을 눌러주세요</p>
                </div>
              )}
              <button
                onClick={() => { setStatus('idle'); fetchContent(); }}
                className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:underline font-bold"
              >
                <FaSyncAlt className="text-[10px]" /> 다시 시도
              </button>
            </div>
          )}

          {/* 성공 — 마크다운 렌더링 */}
          {status === 'done' && (
            <div className="p-6">
              {markdown.trim() ? (
                <MarkdownRenderer content={markdown} />
              ) : (
                <p className="text-sm text-gray-400 italic">페이지 내용이 없습니다.</p>
              )}
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-[10px] text-gray-300 dark:text-gray-600">노션 페이지 내용 (10분 캐시)</span>
                <button
                  onClick={() => { setStatus('idle'); setMarkdown(''); fetchContent(); }}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-violet-500 transition-colors"
                >
                  <FaSyncAlt className="text-[8px]" /> 새로고침
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
