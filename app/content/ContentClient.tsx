'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Send, Trash2, Loader2,
  ImageIcon, X, Rocket, Lightbulb, Sparkles, HelpCircle, MessageSquare, LayoutGrid,
  Pencil, Check,
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getBrowserClient, db } from '@/lib/database';
import type { Post, PostTopic, Comment } from '@/types/database';

// ─── Topics ───────────────────────────────────────────────────

const TOPICS = [
  { value: 'all' as const,       label: '전체',       Icon: LayoutGrid },
  { value: 'showcase' as const,  label: '앱 자랑',    Icon: Rocket },
  { value: 'idea' as const,      label: '아이디어',   Icon: Lightbulb },
  { value: 'tip' as const,       label: '팁 & 노하우', Icon: Sparkles },
  { value: 'question' as const,  label: '질문',       Icon: HelpCircle },
  { value: 'chat' as const,      label: '잡담',       Icon: MessageSquare },
] as const;

type TopicFilter = 'all' | PostTopic;

const TOPIC_LABELS: Record<PostTopic, string> = {
  showcase: '앱 자랑',
  idea: '아이디어',
  tip: '팁 & 노하우',
  question: '질문',
  chat: '잡담',
};

// ─── Utilities ────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return '방금 전';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-rose-500', 'bg-amber-500', 'bg-cyan-500',
  'bg-indigo-500', 'bg-pink-500',
];
function getAvatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getUserName(user: { user_metadata?: { full_name?: string; name?: string }; email?: string } | null) {
  if (!user) return '';
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
}

function getUserAvatar(user: { user_metadata?: { avatar_url?: string; picture?: string } } | null) {
  if (!user) return undefined;
  return user.user_metadata?.avatar_url || user.user_metadata?.picture || undefined;
}

// ─── Image Compression ────────────────────────────────────────

const MAX_ORIGINAL_SIZE = 20 * 1024 * 1024; // 20MB (원본 제한)
const MAX_IMAGES = 4;
const COMPRESS_MAX_PX = 1200;
const COMPRESS_QUALITY = 0.82;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

async function compressToWebP(file: File): Promise<File> {
  // GIF는 애니메이션 유지를 위해 압축하지 않음
  if (file.type === 'image/gif') return file;

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > COMPRESS_MAX_PX || height > COMPRESS_MAX_PX) {
        if (width >= height) {
          height = Math.round(height * COMPRESS_MAX_PX / width);
          width = COMPRESS_MAX_PX;
        } else {
          width = Math.round(width * COMPRESS_MAX_PX / height);
          height = COMPRESS_MAX_PX;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Compression failed'));
          const name = file.name.replace(/\.[^.]+$/, '.webp');
          resolve(new File([blob], name, { type: 'image/webp' }));
        },
        'image/webp',
        COMPRESS_QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    img.src = objectUrl;
  });
}

// URL을 클릭 가능한 링크로 변환
function RichText({ text }: { text: string }) {
  const URL_REGEX = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(URL_REGEX);
  return (
    <span>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────

function Avatar({ name, avatarUrl, size = 'md' }: { name: string; avatarUrl?: string; size?: 'sm' | 'md' }) {
  const [imgError, setImgError] = useState(false);
  const color = getAvatarColor(name);
  const cls = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-sm';

  if (avatarUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={`${cls} rounded-full object-cover flex-shrink-0`}
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={`${cls} rounded-full ${color} flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {name[0]?.toUpperCase() || '?'}
    </div>
  );
}

// ─── Image Grid ───────────────────────────────────────────────

function PostImages({ images }: { images: string[] }) {
  if (!images.length) return null;
  const count = images.length;
  return (
    <div className={`mt-3 grid gap-1 rounded-xl overflow-hidden ${count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
      {images.slice(0, 4).map((src, i) => (
        <div
          key={i}
          className={`relative bg-gray-100 dark:bg-gray-800 ${count === 1 ? 'aspect-video' : 'aspect-square'} ${count === 3 && i === 0 ? 'row-span-2' : ''}`}
        >
          <Image
            src={src}
            alt={`이미지 ${i + 1}`}
            fill
            className="object-cover"
            unoptimized
          />
          {count > 4 && i === 3 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-xl">+{count - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── PostComposer ─────────────────────────────────────────────

async function uploadImage(file: File): Promise<string> {
  const client = getBrowserClient();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/posts/upload-image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  const { url } = await res.json();
  return url;
}

function PostComposer({ onPost }: { onPost: (post: Post) => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState<PostTopic>('chat');
  const [previews, setPreviews] = useState<{ file: File; objectUrl: string; originalSize: number; compressing: boolean }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const { showError, showWarning } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const remaining = MAX_IMAGES - previews.length;
    const candidates = files.slice(0, remaining);
    if (files.length > remaining) {
      showWarning(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`);
    }

    for (const file of candidates) {
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        showError(`${file.name}: JPG, PNG, GIF, WebP 파일만 업로드 가능합니다.`);
        continue;
      }
      if (file.size > MAX_ORIGINAL_SIZE) {
        showError(`${file.name}: 원본 파일은 20MB 이하여야 합니다.`);
        continue;
      }

      const originalSize = file.size;
      const placeholder = { file, objectUrl: URL.createObjectURL(file), originalSize, compressing: true };
      setPreviews((prev) => [...prev, placeholder]);

      try {
        const compressed = await compressToWebP(file);
        const compressedUrl = URL.createObjectURL(compressed);
        setPreviews((prev) =>
          prev.map((p) =>
            p.objectUrl === placeholder.objectUrl
              ? { file: compressed, objectUrl: compressedUrl, originalSize, compressing: false }
              : p
          )
        );
        URL.revokeObjectURL(placeholder.objectUrl);
      } catch {
        showError(`${file.name}: 압축에 실패했습니다.`);
        setPreviews((prev) => prev.filter((p) => p.objectUrl !== placeholder.objectUrl));
        URL.revokeObjectURL(placeholder.objectUrl);
      }
    }
  };

  const removeImage = (i: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[i].objectUrl);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const handleSubmit = async () => {
    if (!content.trim() || submitting || !user) return;
    if (previews.some((p) => p.compressing)) {
      showWarning('이미지 압축이 완료될 때까지 잠시 기다려주세요.');
      return;
    }
    setSubmitting(true);
    try {
      let imageUrls: string[] = [];
      if (previews.length > 0) {
        setUploading(true);
        imageUrls = await Promise.all(previews.map((p) => uploadImage(p.file)));
        setUploading(false);
      }

      const userName = getUserName(user);
      const avatarUrl = getUserAvatar(user);
      const client = getBrowserClient();
      const id = await db.posts.create(
        client,
        { content: content.trim(), images: imageUrls, topic },
        user.id,
        userName,
        avatarUrl
      );
      const newPost: Post = {
        id,
        authorId: user.id,
        authorName: userName,
        authorAvatarUrl: avatarUrl,
        content: content.trim(),
        images: imageUrls,
        topic,
        likes: [],
        likeCount: 0,
        commentCount: 0,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      onPost(newPost);
      setContent('');
      setTopic('chat');
      previews.forEach((p) => URL.revokeObjectURL(p.objectUrl));
      setPreviews([]);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (e) {
      setUploading(false);
      showError(e instanceof Error ? e.message : '포스트 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="px-4 py-5 text-center text-sm text-gray-400 dark:text-gray-600">
        포스트를 작성하려면 로그인해주세요.
      </div>
    );
  }

  const userName = getUserName(user);
  const userAvatar = getUserAvatar(user);

  return (
    <div className="flex gap-3 px-4 py-5">
      <Avatar name={userName} avatarUrl={userAvatar} />
      <div className="flex-1 min-w-0">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => { setContent(e.target.value); autoResize(); }}
          placeholder="무엇을 만들었나요? 자유롭게 공유해보세요..."
          rows={3}
          className="w-full resize-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 text-sm outline-none leading-relaxed"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
        />

        {/* Image previews */}
        {previews.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {previews.map((p, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                {p.compressing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-[10px] text-gray-400">압축 중</span>
                  </div>
                ) : (
                  <>
                    <Image src={p.objectUrl} alt="" fill className="object-cover" unoptimized />
                    {/* 압축 크기 뱃지 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[9px] text-white text-center py-0.5">
                      {formatBytes(p.file.size)}
                    </div>
                  </>
                )}
                {!p.compressing && (
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
          {/* Left: topic + image */}
          <div className="flex items-center gap-2">
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value as PostTopic)}
              className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-1 outline-none cursor-pointer"
            >
              {TOPICS.filter((t) => t.value !== 'all').map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            {previews.length < MAX_IMAGES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 transition-colors"
                title={`이미지 첨부 (최대 ${MAX_IMAGES}장, 자동 WebP 압축)`}
              >
                <ImageIcon className="w-4 h-4" />
                <span className="text-xs hidden sm:inline">
                  {previews.length > 0 ? `${previews.length}/${MAX_IMAGES}` : '이미지'}
                </span>
              </button>
            )}
          </div>

          {/* Right: hint + post button */}
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400 dark:text-gray-600 hidden sm:block">⌘+Enter 게시</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold disabled:opacity-30 transition-opacity hover:opacity-80"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : uploading ? (
                <span className="text-xs">업로드 중...</span>
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              게시
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CommentsSection ──────────────────────────────────────────

function CommentsSection({ postId, onCountChange }: { postId: string; onCountChange?: (delta: number) => void }) {
  const { user } = useAuth();
  const { showError } = useToast();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const client = getBrowserClient();
    db.comments.getByTarget(client, postId, 'post')
      .then((data) => setComments([...data].reverse()))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [postId]);

  const handleSubmit = async () => {
    if (!input.trim() || submitting || !user) return;
    setSubmitting(true);
    const userName = getUserName(user);
    const avatarUrl = getUserAvatar(user);
    try {
      const client = getBrowserClient();
      const id = await db.comments.create(client, postId, 'post', input.trim(), user.id, userName, avatarUrl);
      setComments((prev) => [
        ...(prev || []),
        { id, targetId: postId, targetType: 'post', content: input.trim(), createdBy: user.id, createdByName: userName, createdByAvatarUrl: avatarUrl, createdAt: new Date() },
      ]);
      onCountChange?.(+1);
      setInput('');
    } catch {
      showError('댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (c: Comment) => {
    setEditingId(c.id);
    setEditContent(c.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDeleteComment = async (commentId: string) => {
    if (deletingId) return;
    setDeletingId(commentId);
    try {
      await db.comments.remove(getBrowserClient(), commentId);
      setComments((prev) => prev?.filter((c) => c.id !== commentId) ?? prev);
      onCountChange?.(-1);
    } catch {
      showError('댓글 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const client = getBrowserClient();
      await db.comments.update(client, commentId, editContent.trim());
      setComments((prev) =>
        prev?.map((c) => c.id === commentId ? { ...c, content: editContent.trim() } : c) ?? prev
      );
      cancelEdit();
    } catch {
      showError('수정에 실패했습니다.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="mt-3 ml-1 pl-4 border-l-2 border-gray-100 dark:border-gray-800 space-y-3">
        {loading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-gray-300 dark:text-gray-700" />
          </div>
        ) : (
          comments?.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar name={c.createdByName} avatarUrl={c.createdByAvatarUrl} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{c.createdByName}</span>
                  <span className="text-xs text-gray-400">{formatRelativeTime(c.createdAt)}</span>
                </div>

                {editingId === c.id ? (
                  <div className="mt-1 space-y-1.5">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      autoFocus
                      rows={2}
                      className="w-full resize-none bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-xs outline-none text-gray-900 dark:text-gray-100 leading-relaxed"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveEdit(c.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={cancelEdit}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        취소
                      </button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSaveEdit(c.id)}
                        disabled={!editContent.trim() || savingEdit}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-500 dark:text-blue-400 disabled:opacity-30"
                      >
                        {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        저장
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 group">
                    <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed break-words">
                      <RichText text={c.content} />
                    </p>
                    {user?.id === c.createdBy && (
                      <div className="flex items-center gap-1.5 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-gray-300 hover:text-gray-500 dark:text-gray-700 dark:hover:text-gray-400 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          disabled={deletingId === c.id}
                          className="text-gray-300 hover:text-red-400 dark:text-gray-700 dark:hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          {deletingId === c.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {user && (
          <div className="flex gap-2.5 pb-1">
            <Avatar name={getUserName(user)} avatarUrl={getUserAvatar(user)} size="sm" />
            <div className="flex-1 flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="댓글 달기..."
                className="flex-1 bg-gray-50 dark:bg-gray-800/60 rounded-full px-3 py-1.5 text-xs outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleSubmit}
                disabled={!input.trim() || submitting}
                className="text-blue-500 dark:text-blue-400 disabled:opacity-30"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── PostCard ─────────────────────────────────────────────────

function PostCard({ post, index, onDelete }: { post: Post; index: number; onDelete: (id: string) => void }) {
  const { user } = useAuth();
  const { showError } = useToast();
  const [liked, setLiked] = useState(() => post.likes.includes(user?.id || ''));
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [liking, setLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [deleting, setDeleting] = useState(false);
  // 편집 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editTopic, setEditTopic] = useState<PostTopic>(post.topic);
  const [saving, setSaving] = useState(false);
  // 화면에 표시되는 값 (편집 후 반영)
  const [displayContent, setDisplayContent] = useState(post.content);
  const [displayTopic, setDisplayTopic] = useState<PostTopic>(post.topic);
  const isOwner = user?.id === post.authorId;

  const handleLike = async () => {
    if (!user || liking) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    setLiking(true);
    try {
      const client = getBrowserClient();
      wasLiked
        ? await db.posts.unlike(client, post.id, user.id)
        : await db.posts.like(client, post.id, user.id);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
      showError('오류가 발생했습니다.');
    } finally {
      setLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner || deleting) return;
    setDeleting(true);
    try {
      await db.posts.remove(getBrowserClient(), post.id);
      onDelete(post.id);
    } catch {
      showError('삭제에 실패했습니다.');
      setDeleting(false);
    }
  };

  const startEdit = () => {
    setEditContent(displayContent);
    setEditTopic(displayTopic);
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);

  const handleSave = async () => {
    if (!editContent.trim() || saving) return;
    setSaving(true);
    try {
      await db.posts.update(getBrowserClient(), post.id, editContent.trim(), editTopic);
      setDisplayContent(editContent.trim());
      setDisplayTopic(editTopic);
      setIsEditing(false);
    } catch {
      showError('수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const topicLabel = TOPIC_LABELS[displayTopic];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3), ease: 'easeOut' }}
      className="px-4 py-5"
    >
      <div className="flex gap-3">
        <Avatar name={post.authorName} avatarUrl={post.authorAvatarUrl} />
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{post.authorName}</span>
              <span className="text-xs text-gray-400">{formatRelativeTime(post.createdAt)}</span>
              {!isEditing && (
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {topicLabel}
                </span>
              )}
            </div>
            {isOwner && !isEditing && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={startEdit}
                  className="text-gray-300 hover:text-gray-500 dark:text-gray-700 dark:hover:text-gray-400 transition-colors"
                  title="수정"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-gray-300 hover:text-red-400 dark:text-gray-700 dark:hover:text-red-500 transition-colors"
                  title="삭제"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </motion.button>
              </div>
            )}
          </div>

          {/* Content — normal or edit mode */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoFocus
                rows={4}
                className="w-full resize-none bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 outline-none leading-relaxed border border-gray-200 dark:border-gray-700"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
              <div className="flex items-center gap-2">
                <select
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value as PostTopic)}
                  className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-1 outline-none"
                >
                  {TOPICS.filter((t) => t.value !== 'all').map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <div className="flex-1" />
                <button
                  onClick={cancelEdit}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-3 py-1.5 transition-colors"
                >
                  취소
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  disabled={!editContent.trim() || saving}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-30 transition-opacity"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  저장
                </motion.button>
              </div>
            </div>
          ) : (
            <p className="mt-1.5 text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
              <RichText text={displayContent} />
            </p>
          )}

          {/* Images */}
          {!isEditing && <PostImages images={post.images} />}

          {/* Actions — 편집 중에는 숨김 */}
          <div className={`flex items-center gap-5 mt-3 ${isEditing ? 'hidden' : ''}`}>
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleLike}
              disabled={!user || liking}
              className="flex items-center gap-1.5 group disabled:cursor-default"
            >
              <motion.div
                animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Heart className={`w-4 h-4 transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover:text-red-400 dark:text-gray-600 dark:group-hover:text-red-500'}`} />
              </motion.div>
              <AnimatePresence mode="popLayout">
                {likeCount > 0 && (
                  <motion.span
                    key={likeCount}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className={`text-xs tabular-nums ${liked ? 'text-red-500' : 'text-gray-400 dark:text-gray-600'}`}
                  >
                    {likeCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <button
              onClick={() => setShowComments((v) => !v)}
              className={`flex items-center gap-1.5 transition-colors ${
                showComments || commentCount > 0
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-gray-400 hover:text-blue-500 dark:text-gray-600 dark:hover:text-blue-400'
              }`}
            >
              <MessageCircle className={`w-4 h-4 ${commentCount > 0 ? 'fill-blue-100 dark:fill-blue-900/40' : ''}`} />
              <span className="text-xs">
                {commentCount > 0 ? `댓글 ${commentCount}` : '댓글'}
              </span>
            </button>
          </div>

          {!isEditing && (
            <AnimatePresence>
              {showComments && (
                <CommentsSection
                  key={post.id}
                  postId={post.id}
                  onCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
                />
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────

function Sidebar({ active, onChange, counts }: {
  active: TopicFilter;
  onChange: (t: TopicFilter) => void;
  counts: Record<string, number>;
}) {
  return (
    <aside className="hidden lg:block w-48 shrink-0 sticky top-24 self-start">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-3 px-3">
        Topics
      </p>
      <nav className="space-y-0.5">
        {TOPICS.map(({ value, label, Icon }) => {
          const isActive = active === value;
          const count = value === 'all' ? counts._total : (counts[value] ?? 0);
          return (
            <button
              key={value}
              onClick={() => onChange(value)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-gray-900 dark:text-white' : ''}`} />
              <span className="flex-1">{label}</span>
              {count > 0 && (
                <span className={`text-xs tabular-nums ${isActive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

// 모바일용 가로 스크롤 탭
function MobileTabs({ active, onChange }: { active: TopicFilter; onChange: (t: TopicFilter) => void }) {
  return (
    <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      {TOPICS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            active === value
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────

type ContentClientProps = { initialPosts: Post[] };

export default function ContentClient({ initialPosts }: ContentClientProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [activeTopic, setActiveTopic] = useState<TopicFilter>('all');

  const filtered = activeTopic === 'all' ? posts : posts.filter((p) => p.topic === activeTopic);

  const counts = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.topic] = (acc[p.topic] ?? 0) + 1;
    acc._total = (acc._total ?? 0) + 1;
    return acc;
  }, {});

  const handleNewPost = useCallback((post: Post) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="pt-10 pb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-1">
            Community
          </p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">커뮤니티</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
            만든 것들을 자유롭게 자랑하고 공유해보세요
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <Sidebar active={activeTopic} onChange={setActiveTopic} counts={counts} />

          {/* Feed */}
          <div className="flex-1 min-w-0">
            {/* Composer */}
            <div className="border border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900/50 mb-4">
              <PostComposer onPost={handleNewPost} />
            </div>

            {/* Mobile topic tabs */}
            <MobileTabs active={activeTopic} onChange={setActiveTopic} />

            {/* Posts */}
            <div className="border border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900/50 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
              <AnimatePresence initial mode="popLayout">
                {filtered.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-20 text-center"
                  >
                    <p className="text-4xl mb-3">✨</p>
                    <p className="text-sm text-gray-400 dark:text-gray-600">
                      {activeTopic === 'all'
                        ? '아직 포스트가 없습니다.\n첫 번째 이야기를 올려보세요!'
                        : `${TOPIC_LABELS[activeTopic as PostTopic]} 카테고리에 아직 글이 없습니다.`}
                    </p>
                  </motion.div>
                ) : (
                  filtered.map((post, i) => (
                    <PostCard key={post.id} post={post} index={i} onDelete={handleDelete} />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
