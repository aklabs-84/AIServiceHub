'use client';

import { useCallback, useState } from 'react';
import type { ClipboardEvent, DragEvent } from 'react';
import { getBrowserClient } from '@/lib/database';

const MAX_ORIGINAL_SIZE = 20 * 1024 * 1024;
const COMPRESS_MAX_PX = 1200;
const COMPRESS_QUALITY = 0.8;

async function compressToWebP(file: File): Promise<File> {
  if (file.type === 'image/gif') return file;
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > COMPRESS_MAX_PX || height > COMPRESS_MAX_PX) {
        if (width >= height) { height = Math.round((height * COMPRESS_MAX_PX) / width); width = COMPRESS_MAX_PX; }
        else { width = Math.round((width * COMPRESS_MAX_PX) / height); height = COMPRESS_MAX_PX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Compression failed'));
        const base = (file.name || 'pasted').replace(/\.[^.]+$/, '');
        resolve(new File([blob], `${base}.webp`, { type: 'image/webp' }));
      }, 'image/webp', COMPRESS_QUALITY);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    img.src = objectUrl;
  });
}

async function uploadThumbnail(file: File): Promise<string> {
  const client = getBrowserClient();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) throw new Error('로그인이 필요합니다');
  const form = new FormData();
  form.append('file', file);
  form.append('kind', 'thumbnail');
  const res = await fetch('/api/posts/upload-image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: form,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '업로드에 실패했습니다');
  return (await res.json()).url;
}

/**
 * 썸네일 칸에 이미지를 붙여넣기(Ctrl/⌘+V) 또는 끌어다 놓기로 올리는 훅.
 * 올리기에 성공하면 onUploaded(주소)가 불린다.
 */
export function useImagePasteUpload(onUploaded: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) { setError('이미지 파일만 올릴 수 있어요'); return; }
    if (file.size > MAX_ORIGINAL_SIZE) { setError('이미지가 너무 커요 (20MB 이하)'); return; }
    setUploading(true);
    try {
      const small = await compressToWebP(file);
      if (small.size > 1.5 * 1024 * 1024) throw new Error('이미지 용량이 너무 커요. 더 작은 이미지를 써 주세요 (압축 후 1.5MB 이하)');
      onUploaded(await uploadThumbnail(small));
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드에 실패했습니다');
    } finally {
      setUploading(false);
    }
  }, [onUploaded]);

  const onPaste = useCallback((e: ClipboardEvent) => {
    const file = Array.from(e.clipboardData?.files || []).find((f) => f.type.startsWith('image/'));
    if (!file) return; // 글자(URL) 붙여넣기는 평소처럼 동작
    e.preventDefault();
    void handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: DragEvent) => {
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onDrop = useCallback((e: DragEvent) => {
    const file = Array.from(e.dataTransfer?.files || []).find((f) => f.type.startsWith('image/'));
    setDragOver(false);
    if (!file) return;
    e.preventDefault();
    void handleFile(file);
  }, [handleFile]);

  return {
    uploading,
    dragOver,
    error,
    dropProps: { onPaste, onDragOver, onDragLeave, onDrop },
  };
}
