'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Heart, MessageCircle, Loader2, ImageIcon, X,
  Rocket, Lightbulb, Sparkles, HelpCircle, MessageSquare,
  LayoutGrid, Newspaper, PenLine, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getBrowserClient, db } from '@/lib/database';
import type { Post, PostTopic } from '@/types/database';
import type { CreatePostInputWithTitle } from '@/lib/database/posts';
import MarkdownEditor from '@/components/MarkdownEditor';

// ─── Constants ────────────────────────────────────────────────

const TOPICS = [
  { value: 'all' as const,      label: '전체',        Icon: LayoutGrid },
  { value: 'news' as const,     label: 'AI 소식',     Icon: Newspaper },
  { value: 'showcase' as const, label: '앱 자랑',     Icon: Rocket },
  { value: 'idea' as const,     label: '아이디어',    Icon: Lightbulb },
  { value: 'tip' as const,      label: '팁 & 노하우', Icon: Sparkles },
  { value: 'question' as const, label: '질문',        Icon: HelpCircle },
  { value: 'chat' as const,     label: '자유 토크',   Icon: MessageSquare },
] as const;

type TopicFilter = 'all' | PostTopic;

const TOPIC_LABELS: Record<PostTopic, string> = {
  news: 'AI 소식',
  showcase: '앱 자랑',
  idea: '아이디어',
  tip: '팁 & 노하우',
  question: '질문',
  chat: '자유 토크',
};

const TOPIC_COLORS: Record<PostTopic, string> = {
  news:     'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  showcase: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  idea:     'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  tip:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  question: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  chat:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

// ─── Utilities ────────────────────────────────────────────────

function formatDate(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return m <= 0 ? '방금 전' : `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

function getExcerpt(text: string, len = 80): string {
  const plain = text.replace(/[#*`>\-_~\[\]()!]/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > len ? plain.slice(0, len) + '…' : plain;
}

function getUserName(user: { user_metadata?: { full_name?: string; name?: string }; email?: string } | null) {
  if (!user) return '';
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
}

function getUserAvatar(user: { user_metadata?: { avatar_url?: string; picture?: string } } | null) {
  return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || undefined;
}

const MAX_ORIGINAL_SIZE = 20 * 1024 * 1024;
const MAX_IMAGES = 4;
const COMPRESS_MAX_PX = 1200;
const COMPRESS_QUALITY = 0.82;

async function compressToWebP(file: File): Promise<File> {
  if (file.type === 'image/gif') return file;
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > COMPRESS_MAX_PX || height > COMPRESS_MAX_PX) {
        if (width >= height) { height = Math.round(height * COMPRESS_MAX_PX / width); width = COMPRESS_MAX_PX; }
        else { width = Math.round(width * COMPRESS_MAX_PX / height); height = COMPRESS_MAX_PX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Compression failed'));
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
      }, 'image/webp', COMPRESS_QUALITY);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    img.src = objectUrl;
  });
}

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
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed');
  return (await res.json()).url;
}

// ─── BlogComposer ─────────────────────────────────────────────

function BlogComposer({ onPost, onCancel, isAdmin }: {
  onPost: (post: Post) => void;
  onCancel: () => void;
  isAdmin: boolean;
}) {
  const { user } = useAuth();
  const { showError, showWarning } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState<PostTopic>('chat');
  const [previews, setPreviews] = useState<{ uid: string; file: File; objectUrl: string; compressing: boolean }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    const remaining = MAX_IMAGES - previews.length;
    const candidates = files.slice(0, remaining);
    if (files.length > remaining) showWarning(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`);

    for (const file of candidates) {
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        showError(`${file.name}: JPG, PNG, GIF, WebP만 가능합니다.`); continue;
      }
      if (file.size > MAX_ORIGINAL_SIZE) {
        showError(`${file.name}: 20MB 이하여야 합니다.`); continue;
      }
      const uid = Math.random().toString(36).slice(2, 9);
      const placeholder = { uid, file, objectUrl: URL.createObjectURL(file), compressing: true };
      setPreviews((prev) => [...prev, placeholder]);
      try {
        const compressed = await compressToWebP(file);
        setPreviews((prev) => prev.map((p) =>
          p.uid === uid ? { ...p, file: compressed, objectUrl: URL.createObjectURL(compressed), compressing: false } : p
        ));
        URL.revokeObjectURL(placeholder.objectUrl);
      } catch {
        showError(`${file.name}: 압축 실패`);
        setPreviews((prev) => prev.filter((p) => p.uid !== uid));
        URL.revokeObjectURL(placeholder.objectUrl);
      }
    }
  };

  const removeImage = (uid: string) => {
    setPreviews((prev) => { const t = prev.find((p) => p.uid === uid); if (t) URL.revokeObjectURL(t.objectUrl); return prev.filter((p) => p.uid !== uid); });
  };

  const handleSubmit = async () => {
    if (!content.trim() || submitting || !user) return;
    if (previews.some((p) => p.compressing)) { showWarning('이미지 압축 중입니다. 잠시 기다려주세요.'); return; }
    setSubmitting(true);
    try {
      let imageUrls: string[] = [];
      if (previews.length > 0) imageUrls = await Promise.all(previews.map((p) => uploadImage(p.file)));
      const userName = getUserName(user);
      const avatarUrl = getUserAvatar(user);
      const client = getBrowserClient();
      const input: CreatePostInputWithTitle = { title: title.trim() || undefined, content: content.trim(), images: imageUrls, topic };
      const id = await db.posts.create(client, input, user.id, userName, avatarUrl);
      const newPost: Post = {
        id, authorId: user.id, authorName: userName, authorAvatarUrl: avatarUrl,
        title: title.trim() || undefined, content: content.trim(), images: imageUrls, topic,
        likes: [], likeCount: 0, commentCount: 0, isPublic: true,
        createdAt: new Date(), updatedAt: new Date(),
      };
      onPost(newPost);
      setTitle(''); setContent(''); setTopic('chat');
      previews.forEach((p) => URL.revokeObjectURL(p.objectUrl));
      setPreviews([]);
    } catch (e) {
      showError(e instanceof Error ? e.message : '게시 실패');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="border border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900/50 p-8 text-center text-sm text-gray-400">
        로그인 후 글을 작성할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="border border-blue-200 dark:border-blue-800 rounded-2xl bg-white dark:bg-gray-900/50 p-6 mb-4 space-y-4">
      <h2 className="text-base font-bold text-gray-900 dark:text-white">새 글 작성</h2>

      {/* 제목 */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목을 입력하세요 (선택)"
        className="w-full px-4 py-2.5 text-base font-medium border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* 토픽 */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 shrink-0">게시판</label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value as PostTopic)}
          className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 outline-none text-gray-700 dark:text-gray-300"
        >
          {TOPICS.filter((t) => t.value !== 'all' && (isAdmin || t.value !== 'news')).map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* 에디터 */}
      <MarkdownEditor
        value={content}
        onChange={setContent}
        placeholder="내용을 입력하세요. 마크다운을 지원합니다."
      />

      {/* 이미지 미리보기 */}
      {previews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {previews.map((p) => (
            <div key={p.uid} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
              {p.compressing ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : (
                <Image src={p.objectUrl} alt="" fill className="object-cover" unoptimized />
              )}
              {!p.compressing && (
                <button onClick={() => removeImage(p.uid)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 하단 버튼 */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple className="hidden" onChange={handleFileChange} />
          {previews.length < MAX_IMAGES && (
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
              <ImageIcon className="w-4 h-4" />
              <span>이미지 {previews.length > 0 ? `(${previews.length}/${MAX_IMAGES})` : ''}</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">취소</button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            게시하기
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PostRow ──────────────────────────────────────────────────

function PostRow({ post, onClick }: { post: Post; onClick: () => void }) {
  const displayTitle = post.title || getExcerpt(post.content, 70);
  const hasImages = post.images.length > 0;

  return (
    <div
      onClick={onClick}
      className="group grid grid-cols-[1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-3 gap-y-1 px-4 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
    >
      {/* 토픽 배지 (sm 이상) */}
      <span className={`hidden sm:inline-flex shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${TOPIC_COLORS[post.topic]}`}>
        {TOPIC_LABELS[post.topic]}
      </span>

      {/* 제목 영역 */}
      <div className="min-w-0 col-span-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
            {displayTitle}
          </span>
          {hasImages && <ImageIcon className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" />}
        </div>
        {/* 모바일: 토픽 + 메타 인라인 */}
        <div className="sm:hidden flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TOPIC_COLORS[post.topic]}`}>
            {TOPIC_LABELS[post.topic]}
          </span>
          <span className="text-xs text-gray-400">{post.authorName}</span>
          <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
          <span className="text-xs text-gray-400">{formatDate(post.createdAt)}</span>
        </div>
      </div>

      {/* 작성자 (sm 이상) */}
      <span className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 shrink-0 w-20 text-right truncate">
        {post.authorName}
      </span>

      {/* 날짜 (sm 이상) */}
      <span className="hidden sm:block text-xs text-gray-400 shrink-0 w-14 text-right">
        {formatDate(post.createdAt)}
      </span>

      {/* 댓글/좋아요 */}
      <div className="flex items-center gap-2.5 shrink-0 justify-end">
        {post.commentCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <MessageCircle className="w-3.5 h-3.5" />
            {post.commentCount}
          </span>
        )}
        {post.likeCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Heart className="w-3.5 h-3.5" />
            {post.likeCount}
          </span>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-700 group-hover:text-gray-400 transition-colors" />
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────

function Sidebar({ active, onChange, counts }: { active: TopicFilter; onChange: (t: TopicFilter) => void; counts: Record<string, number> }) {
  return (
    <aside className="hidden lg:block w-48 shrink-0 sticky top-24 self-start">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-3 px-3">게시판</p>
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
                <span className={`text-xs tabular-nums ${isActive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function MobileTabs({ active, onChange }: { active: TopicFilter; onChange: (t: TopicFilter) => void }) {
  return (
    <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide py-3 mb-2">
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

export default function ContentClient({ initialPosts }: { initialPosts: Post[] }) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [activeTopic, setActiveTopic] = useState<TopicFilter>('all');
  const [showComposer, setShowComposer] = useState(false);

  const filtered = activeTopic === 'all' ? posts : posts.filter((p) => p.topic === activeTopic);

  const counts = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.topic] = (acc[p.topic] ?? 0) + 1;
    acc._total = (acc._total ?? 0) + 1;
    return acc;
  }, {});

  const handleNewPost = useCallback((post: Post) => {
    setPosts((prev) => [post, ...prev]);
    setShowComposer(false);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="pt-10 pb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-1">Community</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">커뮤니티</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">만든 것들을 자유롭게 자랑하고 공유해보세요</p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <Sidebar active={activeTopic} onChange={setActiveTopic} counts={counts} />

          {/* Main */}
          <div className="flex-1 min-w-0">

            {/* 글쓰기 버튼 or composer */}
            {showComposer ? (
              <BlogComposer onPost={handleNewPost} onCancel={() => setShowComposer(false)} isAdmin={isAdmin} />
            ) : (
              <div className="flex items-center justify-between mb-4">
                <MobileTabs active={activeTopic} onChange={setActiveTopic} />
                {user ? (
                  <button
                    onClick={() => setShowComposer(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shrink-0"
                  >
                    <PenLine className="w-4 h-4" />
                    글쓰기
                  </button>
                ) : null}
              </div>
            )}

            {/* 게시판 헤더 */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900/50 overflow-hidden">
              {/* 컬럼 헤더 (sm 이상) */}
              <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-16">게시판</span>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">제목</span>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-20 text-right">작성자</span>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-14 text-right">날짜</span>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-16 text-right">반응</span>
              </div>

              {/* 글 목록 */}
              {filtered.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-3xl mb-3">✨</p>
                  <p className="text-sm text-gray-400 dark:text-gray-600">
                    {activeTopic === 'all'
                      ? '아직 글이 없습니다. 첫 번째 이야기를 올려보세요!'
                      : `${TOPIC_LABELS[activeTopic as PostTopic]} 게시판에 아직 글이 없습니다.`}
                  </p>
                  {user && !showComposer && (
                    <button
                      onClick={() => setShowComposer(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <PenLine className="w-4 h-4" />
                      첫 글 쓰기
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    onClick={() => router.push(`/content/${post.id}`)}
                  />
                ))
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
