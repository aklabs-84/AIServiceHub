'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { db, getBrowserClient } from '@/lib/database';
import type { AIApp } from '@/types/database';
import type { Comment } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useOneTimeAccess } from '@/contexts/OneTimeAccessContext';
import { getCategoryInfo } from '@/lib/categories';
import { useAppCategories } from '@/lib/useCategories';
import { formatFileSize } from '@/lib/format';
import PWAInstallButton from '@/components/PWAInstallButton';
import {
  FaExternalLinkAlt, FaEdit, FaTrash, FaUser, FaHeart, FaRegHeart,
  FaCalendar, FaCommentDots, FaPaperPlane, FaChevronLeft, FaChevronRight,
  FaPaperclip, FaDownload, FaLock,
} from 'react-icons/fa';

const COMMENTS_PER_PAGE = 5;

type AppDetailClientProps = {
  initialApp: AIApp | null;
  initialComments: Comment[];
  initialCommentsLoaded?: boolean;
};

export default function AppDetailClient({
  initialApp,
  initialComments,
  initialCommentsLoaded = true,
}: AppDetailClientProps) {
  const markdownComponents: Components = {
    h1: (props) => <h1 className="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100" {...props} />,
    h2: (props) => <h2 className="text-xl font-semibold mt-5 mb-3 text-gray-900 dark:text-gray-100" {...props} />,
    h3: (props) => <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100" {...props} />,
    p: (props) => <p className="leading-relaxed mb-3 last:mb-0" {...props} />,
    ul: (props) => <ul className="list-disc list-outside pl-5 space-y-1 mb-3 last:mb-0" {...props} />,
    ol: (props) => <ol className="list-decimal list-outside pl-5 space-y-1 mb-3 last:mb-0" {...props} />,
    li: (props) => <li className="leading-relaxed" {...props} />,
  };

  const params = useParams();
  const router = useRouter();
  const { user, isAdmin, signInWithGoogle, signInWithKakao } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const { isActive: hasOneTimeAccess } = useOneTimeAccess();
  const { categories } = useAppCategories();
  const [app, setApp] = useState<AIApp | null>(initialApp);
  const [loading, setLoading] = useState(!initialApp);
  const [imageError, setImageError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialApp?.likeCount ?? 0);
  const [isLiking, setIsLiking] = useState(false);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentPage, setCommentPage] = useState(1);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);

  const thumbnailPosition = app
    ? { objectPosition: `${app.thumbnailPositionX ?? 50}% ${app.thumbnailPositionY ?? 50}%` }
    : undefined;

  const loadApp = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getBrowserClient();
      const data = await db.apps.getById(supabase, params.id as string);
      setApp(data);
    } catch (error) {
      console.error('Error loading app:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const loadComments = useCallback(async () => {
    try {
      const supabase = getBrowserClient();
      const data = await db.comments.getByTarget(supabase, params.id as string, 'app');
      setComments(data);
      setCommentPage(1);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }, [params.id]);

  useEffect(() => {
    if (!initialApp) loadApp();
    if (!initialCommentsLoaded) loadComments();
  }, [loadApp, loadComments, initialApp, initialCommentsLoaded]);

  useEffect(() => {
    if (app) {
      setIsLiked(user ? app.likes.includes(user.id) : false);
      setLikeCount(app.likeCount);
    }
  }, [app, user]);

  useEffect(() => {
    const total = Math.ceil(comments.length / COMMENTS_PER_PAGE) || 1;
    setCommentPage((prev) => Math.min(prev, total));
  }, [comments.length]);

  const handleSubmitComment = async () => {
    if (!user || !app || !newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const supabase = getBrowserClient();
      await db.comments.create(supabase, app.id, 'app', newComment.trim(), user.id, (user.user_metadata?.full_name || user.user_metadata?.name) || '익명');
      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      showError('댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingId(comment.id);
    setEditingContent(comment.content);
  };

  const handleUpdateComment = async () => {
    if (!editingId || !editingContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      const supabase = getBrowserClient();
      await db.comments.update(supabase, editingId, editingContent.trim());
      setEditingId(null);
      setEditingContent('');
      await loadComments();
    } catch (error) {
      console.error('Error updating comment:', error);
      showError('댓글 수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      const supabase = getBrowserClient();
      await db.comments.remove(supabase, commentId);
      await loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      showError('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleLike = async () => {
    if (!user || !app || isLiking) return;
    setIsLiking(true);
    try {
      const supabase = getBrowserClient();
      if (isLiked) {
        await db.apps.unlike(supabase, app.id, user.id);
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        await db.apps.like(supabase, app.id, user.id);
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!app || !user) return;
    if (!confirm('정말 이 앱을 삭제하시겠습니까?')) return;
    setDeleting(true);
    try {
      const supabase = getBrowserClient();
      await db.apps.remove(supabase, app.id);
      showSuccess('앱이 삭제되었습니다.');
      router.refresh();
      const lastUrl = sessionStorage.getItem('lastAppsListUrl');
      router.push(lastUrl || '/apps');
    } catch (error) {
      console.error('Error deleting app:', error);
      showError('앱 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadAttachment = async (storagePath: string, filename: string, fallbackUrl?: string) => {
    if (!user) { showWarning('로그인 후 다운로드할 수 있습니다.'); return; }
    setDownloadingPath(storagePath);
    try {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const idToken = session?.access_token;
      if (!idToken) throw new Error('인증 토큰을 찾을 수 없습니다.');
      await db.attachments.downloadFile(storagePath, filename, 'app', idToken, fallbackUrl);
    } catch (error) {
      console.error('Failed to download attachment:', error);
      showError('첨부 파일 다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloadingPath(null);
    }
  };

  const goBack = () => {
    const lastUrl = sessionStorage.getItem('lastAppsListUrl');
    if (lastUrl) router.push(lastUrl);
    else router.push('/apps');
  };

  const getDomainLabel = (url: string) => {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      if (hostname.includes('github.com') || hostname.includes('github.io')) return 'GitHub';
      if (hostname.includes('aistudio.google.com')) return 'Google AI Studio';
      if (hostname.includes('colab.research.google.com')) return 'Google Colab';
      if (hostname === 'huggingface.co') return 'Hugging Face';
      if (hostname === 'chat.openai.com' || hostname === 'chatgpt.com') return 'ChatGPT';
      if (hostname === 'youtube.com' || hostname === 'youtu.be') return 'YouTube';
      if (hostname.includes('naver.com')) return 'Naver';
      if (hostname.includes('notion.site') || hostname.includes('notion.so')) return 'Notion';
      return '웹사이트';
    } catch { return '웹사이트'; }
  };

  const getLinkPreview = (url: string, label?: string) => {
    const blogFallback = '/blog-placeholder.svg';
    const defaultFallback = '/globe.svg';
    const labelText = (label || '').trim();
    const isEtcLink = labelText === '링크';
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.replace('www.', '');
      const host = hostname.toLowerCase();
      const isBlog = host.includes('blog.') || host.includes('naver.com') || host.includes('tistory') || host.includes('medium.com');
      const useBlogPlaceholder = isEtcLink || isBlog;
      const favicon = useBlogPlaceholder ? blogFallback : `https://www.google.com/s2/favicons?sz=128&domain=${parsed.hostname}`;
      const fallback = useBlogPlaceholder ? blogFallback : defaultFallback;
      return { hostname, favicon, fallback };
    } catch {
      return { hostname: url, favicon: isEtcLink ? blogFallback : defaultFallback, fallback: isEtcLink ? blogFallback : defaultFallback };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">앱을 찾을 수 없습니다</h1>
        <Link href="/apps" className="text-blue-600 hover:underline">목록으로 돌아가기</Link>
      </div>
    );
  }

  const categoryInfo = getCategoryInfo(app.category, categories);
  const CategoryIcon = categoryInfo.icon;
  const isOwner = user?.id === app.createdBy || isAdmin;
  const isPublic = app.isPublic ?? true;

  if (!isPublic && !isOwner && !hasOneTimeAccess) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">비공개 앱입니다</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">작성자만 볼 수 있는 앱입니다.</p>
        <Link href="/apps" className="text-blue-600 hover:underline">바이브코딩 목록으로 돌아가기</Link>
      </div>
    );
  }

  const parsedSns = app.snsUrls.map((entry) => {
    const parts = entry.split(':');
    if (parts.length >= 2) {
      const label = parts.shift()?.trim() || '';
      const url = parts.join(':').trim();
      return { label, url };
    }
    return { label: '', url: entry };
  });

  const publicUrls = app.appUrls.filter((u) => u.isPublic || isOwner);
  const primaryUrl = publicUrls[0]?.url;

  const totalCommentPages = Math.ceil(comments.length / COMMENTS_PER_PAGE) || 1;
  const startIdx = (commentPage - 1) * COMMENTS_PER_PAGE;
  const paginatedComments = comments.slice(startIdx, startIdx + COMMENTS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-3xl">

        {/* Back button */}
        <button
          onClick={goBack}
          className="group mb-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <FaChevronLeft className="text-xs group-hover:-translate-x-0.5 transition-transform" />
          바이브코딩
        </button>

        {/* App Header Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden mb-4">

          {/* Icon + Info */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-5">

              {/* Square App Icon */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-none rounded-[22%] overflow-hidden shadow-lg">
                {app.thumbnailUrl && !imageError ? (
                  <Image
                    src={app.thumbnailUrl}
                    alt={app.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                    style={thumbnailPosition}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${categoryInfo.color} relative overflow-hidden`}>
                    <CategoryIcon className="text-white/15 text-5xl absolute -right-1 -bottom-1 rotate-12" />
                    <CategoryIcon className="text-white text-3xl relative z-10" />
                  </div>
                )}
              </div>

              {/* App Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${categoryInfo.color}`}>
                    {categoryInfo.label}
                  </span>
                  {!isPublic && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      비공개
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
                  {app.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1.5">
                    <FaUser className="text-purple-400" />
                    {app.createdByName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FaCalendar className="text-blue-400" />
                    {new Date(app.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Primary: open app */}
                  {!user ? (
                    <div className="flex gap-2">
                      <button
                        onClick={signInWithKakao}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#FEE500] text-black text-sm font-bold hover:bg-[#FDD835] transition shadow-sm"
                      >
                        Kakao 로그인
                      </button>
                      <button
                        onClick={signInWithGoogle}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition shadow-sm"
                      >
                        Google 로그인
                      </button>
                    </div>
                  ) : primaryUrl ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={primaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all hover:-translate-y-0.5 shadow-md hover:shadow-blue-500/30 text-sm"
                      >
                        <FaExternalLinkAlt className="text-xs" />
                        웹앱 열기
                      </a>
                      <PWAInstallButton
                        appUrl={primaryUrl}
                        appName={app.name}
                        variant="secondary"
                        size="md"
                      />
                    </div>
                  ) : null}

                  {/* Like */}
                  <button
                    onClick={handleLike}
                    disabled={!user || isLiking}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all ${isLiked
                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                      } ${isLiking ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {isLiked ? <FaHeart /> : <FaRegHeart />}
                    <span>{likeCount}</span>
                  </button>

                  {/* Owner actions */}
                  {isOwner && (
                    <>
                      <Link
                        href={`/apps/${app.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
                      >
                        <FaEdit className="text-xs" />
                        수정
                      </Link>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
                      >
                        <FaTrash className="text-xs" />
                        {deleting ? '삭제 중...' : '삭제'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Screenshot / thumbnail preview (if exists) */}
          {app.thumbnailUrl && !imageError && (
            <div className="relative w-full aspect-[16/9] border-t border-gray-100 dark:border-gray-800">
              <Image
                src={app.thumbnailUrl}
                alt={`${app.name} 스크린샷`}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                style={thumbnailPosition}
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 mb-4">
          <div className="prose prose-sm sm:prose prose-slate dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {app.description || ''}
            </ReactMarkdown>
          </div>
        </div>

        {/* Tags */}
        {app.tags && app.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 px-1">
            {app.tags.map((tag) => (
              <Link
                key={tag}
                href={`/apps?tag=${encodeURIComponent(tag)}`}
                className="px-3 py-1.5 rounded-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-all font-medium"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Launch URLs */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 mb-4">
          <h2 className="text-sm font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaExternalLinkAlt className="text-blue-500 text-xs" />
            실행
          </h2>
          {!user ? (
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">로그인 후 URL을 확인할 수 있습니다.</p>
              <div className="flex gap-2">
                <button
                  onClick={signInWithKakao}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#FEE500] text-black text-sm font-semibold hover:bg-[#FDD835] transition"
                >
                  Kakao 로그인
                </button>
                <button
                  onClick={signInWithGoogle}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                >
                  Google 로그인
                </button>
              </div>
            </div>
          ) : publicUrls.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">표시할 수 있는 URL이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {publicUrls.map((urlItem, idx) => {
                const isDefaultLabel = urlItem.label === '이동하기' || (urlItem.label || '').startsWith('링크 ');
                const displayLabel = (!urlItem.label || isDefaultLabel) ? getDomainLabel(urlItem.url) : urlItem.label;
                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{displayLabel}</span>
                        {!urlItem.isPublic && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <FaLock className="text-[9px]" /> 나만 보기
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{urlItem.url}</p>
                    </div>
                    <a
                      href={urlItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition whitespace-nowrap shadow-sm"
                    >
                      열기 <FaExternalLinkAlt className="text-[10px]" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SNS / Channels */}
        {parsedSns.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 mb-4">
            <h2 className="text-sm font-black text-gray-900 dark:text-white mb-4">SNS / 채널</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {parsedSns.map((item, idx) => {
                const preview = getLinkPreview(item.url, item.label);
                return (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 hover:border-blue-200 dark:hover:border-blue-800/50 hover:shadow-sm transition"
                  >
                    <div className="relative h-10 w-10 rounded-xl bg-white dark:bg-gray-700 overflow-hidden flex-shrink-0 shadow-sm">
                      <Image
                        src={preview.favicon}
                        alt={item.label || preview.hostname}
                        fill
                        sizes="40px"
                        className="object-contain"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.includes(preview.fallback)) target.src = preview.fallback;
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {item.label || preview.hostname}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{preview.hostname}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Attachments */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 mb-4">
          <h2 className="text-sm font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaPaperclip className="text-gray-400" />
            첨부 파일
          </h2>
          {app.attachments.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">등록된 파일이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {app.attachments.map((file) => (
                <div
                  key={file.storagePath}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(file.size)} · {file.contentType || '파일'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(file.storagePath, file.name)}
                    disabled={downloadingPath === file.storagePath}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-60"
                  >
                    <FaDownload />
                    {downloadingPath === file.storagePath ? '준비 중...' : '다운로드'}
                  </button>
                </div>
              ))}
            </div>
          )}
          {!user && app.attachments.length > 0 && (
            <p className="text-xs text-gray-400 mt-3">로그인 후 파일을 다운로드할 수 있습니다.</p>
          )}
        </div>

        {/* Comments */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <FaCommentDots className="text-blue-500" />
            <h3 className="text-sm font-black text-gray-900 dark:text-white">댓글</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">({comments.length})</span>
          </div>

          {user ? (
            <div className="mb-5">
              <div className="flex items-start gap-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글을 남겨보세요"
                  className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submitting}
                  className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  <FaPaperPlane className="text-xs" />
                  {submitting ? '등록 중...' : '등록'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-5 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
              로그인한 사용자만 댓글을 작성할 수 있습니다.
            </div>
          )}

          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">첫 댓글을 작성해 보세요.</p>
            ) : (
              paginatedComments.map((comment) => {
                const isAuthor = user?.id === comment.createdBy;
                const isEditing = editingId === comment.id;
                return (
                  <div key={comment.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-bold text-gray-800 dark:text-gray-200">{comment.createdByName}</span>
                      <span>{comment.createdAt.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setEditingId(null); setEditingContent(''); }} className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">취소</button>
                          <button onClick={handleUpdateComment} disabled={!editingContent.trim() || submitting} className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50">저장</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{comment.content}</p>
                    )}
                    {isAuthor && !isEditing && (
                      <div className="flex gap-2 justify-end text-xs">
                        <button onClick={() => handleEditComment(comment)} className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition">수정</button>
                        <button onClick={() => handleDeleteComment(comment.id)} className="px-3 py-1 rounded-lg border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">삭제</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {comments.length > COMMENTS_PER_PAGE && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => setCommentPage((p) => Math.max(1, p - 1))} disabled={commentPage === 1} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50">
                <FaChevronLeft className="text-[10px]" /> 이전
              </button>
              <span className="text-xs text-gray-500">{commentPage} / {totalCommentPages}</span>
              <button onClick={() => setCommentPage((p) => Math.min(totalCommentPages, p + 1))} disabled={commentPage === totalCommentPages} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50">
                다음 <FaChevronRight className="text-[10px]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
