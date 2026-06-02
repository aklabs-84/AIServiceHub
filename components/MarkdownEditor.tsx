'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { commands } from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

// 문단 여백 버튼 — 커서 위치에 빈 줄(\n\n) 삽입
const paragraphBreak: typeof commands.bold = {
  name: 'paragraph-break',
  keyCommand: 'paragraph-break',
  buttonProps: { 'aria-label': '문단 여백', title: '문단 여백 (빈 줄 삽입)' },
  icon: (
    <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>
      ¶
    </span>
  ),
  execute(_state, api) {
    api.replaceSelection('\n\n');
  },
};

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
        commands={[
          commands.bold,
          commands.italic,
          commands.strikethrough,
          commands.divider,
          commands.title1,
          commands.title2,
          commands.title3,
          commands.divider,
          commands.unorderedListCommand,
          commands.orderedListCommand,
          commands.divider,
          commands.link,
          commands.image,
          commands.quote,
          commands.code,
          commands.divider,
          paragraphBreak,
        ]}
        extraCommands={[commands.codeEdit, commands.codeLive, commands.codePreview]}
      />
    </div>
  );
}
