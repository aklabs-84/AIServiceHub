'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
  minHeight = 220,
}: MarkdownEditorProps) {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const update = () => {
      setColorMode(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div data-color-mode={colorMode}>
      <MDEditor
        value={value}
        onChange={v => onChange(v ?? '')}
        preview="edit"
        height={minHeight}
        textareaProps={{ placeholder }}
        style={{ borderRadius: '0.75rem', fontSize: '14px' }}
      />
    </div>
  );
}
