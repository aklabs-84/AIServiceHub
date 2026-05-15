'use client';

import { useEffect, useRef, useState } from 'react';
import { getBrowserClient } from '@/lib/database';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  accentColor?: 'blue' | 'emerald';
}

export default function TagInput({
  value,
  onChange,
  placeholder = 'AI, 챗봇, 자동화',
  accentColor = 'blue',
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchTags() {
      try {
        const supabase = getBrowserClient();
        const [appsRes, promptsRes] = await Promise.all([
          supabase.from('apps').select('tags').eq('is_public', true),
          supabase.from('prompts').select('tags').eq('is_public', true),
        ]);
        const tagSet = new Set<string>();
        [...(appsRes.data ?? []), ...(promptsRes.data ?? [])].forEach((row) => {
          (row.tags as string[] | null)?.forEach((t) => {
            const trimmed = t.trim();
            if (trimmed) tagSet.add(trimmed);
          });
        });
        setAllTags(Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'ko')));
      } catch {
        // 태그 목록 로드 실패 시 자동완성 없이 동작
      }
    }
    fetchTags();
  }, []);

  useEffect(() => {
    const query = input.trim().toLowerCase();
    if (!query) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const filtered = allTags
      .filter((t) => t.toLowerCase().includes(query) && !value.includes(t))
      .slice(0, 8);
    setSuggestions(filtered);
    setShowDropdown(filtered.length > 0);
  }, [input, allTags, value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        !dropdownRef.current?.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const ringColor = accentColor === 'emerald' ? 'focus-within:ring-emerald-500' : 'focus-within:ring-blue-500';
  const chipColor =
    accentColor === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';

  return (
    <div className="relative">
      <div
        className={`flex flex-wrap gap-1.5 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 min-h-[42px] focus-within:ring-2 focus-within:border-transparent transition ${ringColor}`}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${chipColor}`}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="leading-none hover:opacity-60 transition-opacity"
              aria-label={`${tag} 태그 제거`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          className="flex-1 min-w-[100px] bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          placeholder={value.length === 0 ? placeholder : '태그 추가...'}
        />
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
        >
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(tag);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
