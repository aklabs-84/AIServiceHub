'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { db, getBrowserClient } from '@/lib/database';
import type { Prompt } from '@/types/database';
import { getPromptCategoryInfo } from '@/lib/promptCategories';
import { usePromptCategories } from '@/lib/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { useOneTimeAccess } from '@/contexts/OneTimeAccessContext';
import { FaCalendar, FaCommentDots, FaExternalLinkAlt, FaFeatherAlt, FaLink, FaUser, FaLock, FaEdit, FaTrash, FaPaperPlane, FaChevronLeft, FaChevronRight, FaDownload, FaPaperclip, FaCopy, FaCheck, FaHeart, FaRegHeart } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Comment } from '@/types/database';
import { useToast } from '@/contexts/ToastContext';
import { formatFileSize } from '@/lib/format';

const COMMENTS_PER_PAGE = 5;

type PromptDetailClientProps = {
  initialPrompt: Prompt | null;
  initialComments: Comment[];
  initialCommentsLoaded?: boolean;
};

export default function PromptDetailClient({
  initialPrompt,
  initialComments,
  initialCommentsLoaded = true,
}: PromptDetailClientProps) {
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);
  type CodeProps = React.ComponentPropsWithoutRef<'code'> & { inline?: boolean };

  const markdownComponents: Components = {
    h1: (props) => <h1 className="text-3xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100" {...props} />,
    h2: (props) => <h2 className="text-2xl font-semibold mt-5 mb-3 text-gray-900 dark:text-gray-100" {...props} />,
    h3: (props) => <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100" {...props} />,
    p: (props) => <p className="leading-relaxed mb-3 last:mb-0" {...props} />,
    ul: (props) => <ul className="list-disc list-outside pl-5 space-y-1 mb-3 last:mb-0" {...props} />,
    ol: (props) => <ol className="list-decimal list-outside pl-5 space-y-1 mb-3 last:mb-0" {...props} />,
    li: (props) => <li className="leading-relaxed" {...props} />,
    code: ({ inline, className, children, ...props }: CodeProps) => {
      if (inline) {
        return (
          <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs" {...props} />
        );
      }
      const raw = String(children || '');
      const trimmed = raw.replace(/\n$/, '');
      const blockId = `${trimmed.slice(0, 48)}-${trimmed.length}`;
      const isCopied = copiedBlock === blockId;
      return (
        <div className="relative group">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(trimmed);
                setCopiedBlock(blockId);
                setTimeout(() => setCopiedBlock((prev) => (prev === blockId ? null : prev)), 1200);
              } catch (error) {
                console.error('Failed to copy code:', error);
              }
            }}
            className="absolute top-3 right-3 flex items-center gap-1 rounded-md bg-gray-900/80 text-white text-xs px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition"
          >
            {isCopied ? <FaCheck /> : <FaCopy />}
            <span>{isCopied ? '복사됨' : '복사'}</span>
          </button>
          <pre className="overflow-x-auto rounded-xl bg-gray-900 text-gray-100 text-sm p-4 border border-gray-800">
            <code className={className}>{trimmed}</code>
          </pre>
        </div>
      );
    },
  };

  const params = useParams();
  const router = useRouter();
  const { user, isAdmin, signInWithGoogle, signInWithKakao } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const { isActive: hasOneTimeAccess } = useOneTimeAccess();
  const { categories } = usePromptCategories();
  const [prompt, setPrompt] = useState<Prompt | null>(initialPrompt);
  const [loading, setLoading] = useState(!initialPrompt);
  const [deleting, setDeleting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialPrompt?.likeCount ?? 0);
  const [isLiking, setIsLiking] = useState(false);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentPage, setCommentPage] = useState(1);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);

  const thumbnailPosition = prompt
    ? { objectPosition: `${prompt.thumbnailPositionX ?? 50}% ${prompt.thumbnailPositionY ?? 50}%` }
    : undefined;

  const loadPrompt = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getBrowserClient();
      const data = await db.prompts.getById(supabase, params.id as string);
      setPrompt(data);
    } catch (error) {
      console.error('Error loading prompt:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const loadComments = useCallback(async () => {
    try {
      const supabase = getBrowserClient();
      const data = await db.comments.getByTarget(supabase, params.id as string, 'prompt');
      setComments(data);
      setCommentPage(1);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }, [params.id]);

  useEffect(() => {
    if (!initialPrompt) {
      loadPrompt();
    }
    if (!initialCommentsLoaded) {
      loadComments();
    }
  }, [loadPrompt, loadComments, initialPrompt, initialCommentsLoaded]);

  useEffect(() => {
    if (prompt) {
      console.log('[PromptDetail] Loaded prompt:', prompt);
      console.log('[PromptDetail] Attachments:', prompt.attachments);
      setIsLiked(user ? prompt.likes.includes(user.id) : false);
      setLikeCount(prompt.likeCount);
    }
  }, [prompt, user]);

  useEffect(() => {
    const total = Math.ceil(comments.length / COMMENTS_PER_PAGE) || 1;
    setCommentPage((prev) => Math.min(prev, total));
  }, [comments.length]);

  const handleSubmitComment = async () => {
    if (!user || !prompt || !newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const supabase = getBrowserClient();
      await db.comments.create(supabase, prompt.id, 'prompt', newComment.trim(), user.id, (user.user_metadata?.full_name || user.user_metadata?.name) || '익명');
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
    if (!user || !prompt || isLiking) return;

    setIsLiking(true);
    try {
      const supabase = getBrowserClient();
      if (isLiked) {
        await db.prompts.unlike(supabase, prompt.id, user.id);
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        await db.prompts.like(supabase, prompt.id, user.id);
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
    if (!prompt || !user) return;

    if (!confirm('정말 이 프롬프트를 삭제하시겠습니까?')) {
      return;
    }

    setDeleting(true);
    try {
      const supabase = getBrowserClient();
      await db.prompts.remove(supabase, prompt.id);
      showSuccess('프롬프트가 삭제되었습니다.');
      router.refresh();
      const lastUrl = sessionStorage.getItem('lastPromptsListUrl');
      router.push(lastUrl || '/prompts');
    } catch (error) {
      console.error('Error deleting prompt:', error);
      showError('프롬프트 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadAttachment = async (storagePath: string, filename: string, fallbackUrl?: string) => {
    if (!user) {
      showWarning('로그인 후 다운로드할 수 있습니다.');
      return;
    }
    setDownloadingPath(storagePath);
    try {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const idToken = session?.access_token;
      if (!idToken) throw new Error('인증 토큰을 찾을 수 없습니다.');
      await db.attachments.downloadFile(storagePath, filename, 'prompt', idToken, fallbackUrl);
    } catch (error) {
      console.error('Failed to download attachment:', error);
      showError('첨부 파일 다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloadingPath(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          프롬프트를 찾을 수 없습니다
        </h1>
        <Link href="/" className="text-emerald-600 hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const categoryInfo = getPromptCategoryInfo(prompt.category, categories);
  const CategoryIcon = categoryInfo.icon;
  const isOwner = user?.id === prompt.createdBy || isAdmin;
  const isPublic = prompt.isPublic ?? true;

  if (!isPublic && !isOwner && !hasOneTimeAccess) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          비공개 프롬프트입니다
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          작성자만 볼 수 있는 프롬프트입니다.
        </p>
        <Link href="/prompts" className="text-emerald-600 hover:underline">
          프롬프트 목록으로 돌아가기
        </Link>
      </div>
    );
  }
  const parsedSns = prompt.snsUrls.map((entry) => {
    const parts = entry.split(':');
    if (parts.length >= 2) {
      const label = parts.shift()?.trim() || '';
      const url = parts.join(':').trim();
      return { label, url };
    }
    return { label: '', url: entry };
  });

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
      const fallback = useBlogPlaceholder ? blogFallback : defaultFallback;

      let icon = 'default';
      if (hostname.includes('instagram.com')) icon = 'instagram';
      else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) icon = 'youtube';
      else if (isBlog) icon = isEtcLink ? 'blog-placeholder' : 'blog';

      const favicon = useBlogPlaceholder
        ? blogFallback
        : `https://www.google.com/s2/favicons?sz=128&domain=${parsed.hostname}`;

      return { hostname, favicon, fallback, icon };
    } catch {
      return {
        hostname: url,
        favicon: isEtcLink ? blogFallback : defaultFallback,
        fallback: isEtcLink ? blogFallback : defaultFallback,
        icon: 'default'
      };
    }
  };

  // 상세 정보 표시
  const totalCommentPages = Math.ceil(comments.length / COMMENTS_PER_PAGE) || 1;
  const startIdx = (commentPage - 1) * COMMENTS_PER_PAGE;
  const paginatedComments = comments.slice(startIdx, startIdx + COMMENTS_PER_PAGE);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="relative w-full h-64 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40">
            {prompt.thumbnailUrl && !imageError ? (
              <Image
                src={prompt.thumbnailUrl}
                alt={prompt.name}
                fill
                sizes="100vw"
                className="object-cover"
                style={thumbnailPosition}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${categoryInfo.color.replace('bg-', 'text-').replace('100', '500')}`}>
                <CategoryIcon className="text-8xl opacity-50" />
              </div>
            )}
          </div>

          <div className="p-8">
            <button
              onClick={() => {
                const lastUrl = sessionStorage.getItem('lastPromptsListUrl');
                if (lastUrl) router.push(lastUrl);
                else router.push('/prompts');
              }}
              className="group mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-gray-700 dark:text-gray-200 text-sm font-semibold shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
            >
              <FaChevronLeft className="group-hover:-translate-x-1 transition-transform" />
              <span>목록으로 돌아가기</span>
            </button>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                {prompt.name}
              </h1>
              <span className={`px-4 py-2 rounded-full text-white bg-emerald-500`}>
                {categoryInfo.label}
              </span>
            </div>

            {/* 태그 영역 */}
            {prompt.tags && prompt.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {prompt.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/prompts?tag=${encodeURIComponent(tag)}`}
                    className="text-sm px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all font-medium"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            <div className="prose prose-slate dark:prose-invert max-w-none text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {prompt.description || ''}
              </ReactMarkdown>
            </div>
            {/* 메타 정보 */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <FaUser className="text-purple-500" />
                  <span>{prompt.createdByName}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <FaCalendar className="text-emerald-500" />
                  <span>{new Date(prompt.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${isLiked
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                  } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLiked ? <FaHeart /> : <FaRegHeart />}
                <span className="font-semibold">{likeCount}</span>
              </button>
            </div>

            {/* 프롬프트 내용 (잠금/해제) */}
            <div className="mb-6 space-y-4">
              {user ? (
                <>
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                    <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-100 mb-2 flex items-center space-x-2">
                      <FaLink />
                      <span>프롬프트 본문</span>
                    </h2>
                    <div className="prose prose-sm max-w-none text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800/50 font-mono whitespace-pre-wrap leading-relaxed relative overflow-hidden">
                      {prompt.promptContent}
                    </div>
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(prompt.promptContent);
                            showSuccess('프롬프트가 복사되었습니다.');
                          } catch (err) {
                            showError('복사에 실패했습니다.');
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition text-xs font-semibold"
                      >
                        <FaCopy />
                        <span>전체 복사</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center space-x-2">
                      <FaPaperclip />
                      <span>첨부 파일</span>
                    </h2>
                    {prompt.attachments.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">등록된 파일이 없습니다.</p>
                    ) : (
                      <div className="space-y-2">
                        {prompt.attachments.map((file) => (
                          <div
                            key={file.storagePath}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-gray-900 dark:text-gray-100">{file.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(file.size)} · {file.contentType || '파일'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDownloadAttachment(file.storagePath, file.name)}
                              disabled={downloadingPath === file.storagePath}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
                            >
                              <FaDownload />
                              {downloadingPath === file.storagePath ? '준비 중...' : '다운로드'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-6 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-200 shrink-0">
                    <FaLock className="text-2xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                      로그인 후 전체 내용을 확인하세요
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      프롬프트 본문과 첨부 파일을 확인하려면 로그인이 필요합니다.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <button
                      onClick={signInWithKakao}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-[#FEE500] text-black text-sm font-bold shadow hover:bg-[#FDD835] transition"
                    >
                      Kakao 로그인
                    </button>
                    <button
                      onClick={signInWithGoogle}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-bold shadow hover:bg-gray-50 transition"
                    >
                      Google 로그인
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center space-x-2">
                <FaExternalLinkAlt />
                <span>SNS / 채널</span>
              </h2>
              {parsedSns.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">등록된 SNS 링크가 없습니다.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {parsedSns.map((item, idx) => {
                    const preview = getLinkPreview(item.url, item.label);
                    const renderIcon = () => {
                      switch (preview.icon) {
                        case 'instagram':
                          return <Image src="/instagram-icon.svg" alt="Instagram" fill sizes="40px" className="object-contain" />;
                        case 'blog-placeholder':
                          return <Image src={preview.favicon} alt="Blog link" fill sizes="40px" className="object-contain" />;
                        case 'blog':
                          return <Image src="/naver-blog.svg" alt="Naver Blog" fill sizes="40px" className="object-contain" />;
                        case 'youtube':
                          return <Image src="/youtube.svg" alt="YouTube" fill sizes="40px" className="object-contain" />;
                        default:
                          return (
                            <Image
                              src={preview.favicon}
                              alt={item.label || preview.hostname}
                              fill
                              sizes="40px"
                              className="object-contain"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                if (!target.src.includes(preview.fallback)) {
                                  target.src = preview.fallback;
                                }
                              }}
                            />
                          );
                      }
                    };
                    return (
                      <a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md transition"
                      >
                        <div className="relative h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                          {renderIcon()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {item.label || preview.hostname}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{preview.hostname}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
              {isOwner && (
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/prompts/${prompt.id}/edit`)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-semibold"
                  >
                    <FaEdit />
                    <span>수정</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-60 text-sm font-semibold shadow-sm"
                  >
                    <FaTrash />
                    <span>{deleting ? '삭제 중...' : '삭제'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* 댓글 */}
        <div className="mt-12 bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaCommentDots className="text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">댓글</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">({comments.length})</span>
          </div>

          {user ? (
            <div className="mb-4">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">댓글을 남겨보세요</label>
              <div className="flex items-center gap-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="내용을 입력하세요"
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submitting}
                  className="h-full px-4 py-3 rounded-lg bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {submitting ? '등록 중...' : (
                    <div className="flex items-center gap-2">
                      <FaPaperPlane />
                      <span>등록</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4 text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg px-4 py-3">
              로그인한 사용자만 댓글을 작성할 수 있습니다.
            </div>
          )}

          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">첫 댓글을 작성해 보세요.</p>
            ) : (
              paginatedComments.map((comment) => {
                const isAuthor = user?.id === comment.createdBy;
                const isEditing = editingId === comment.id;
                return (
                  <div key={comment.id} className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{comment.createdByName}</span>
                      <span>{comment.createdAt.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          rows={3}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingContent('');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                          >
                            취소
                          </button>
                          <button
                            onClick={handleUpdateComment}
                            disabled={!editingContent.trim() || submitting}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{comment.content}</p>
                    )}
                    {isAuthor && !isEditing && (
                      <div className="flex gap-2 justify-end text-xs">
                        <button
                          onClick={() => handleEditComment(comment)}
                          className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {comments.length > COMMENTS_PER_PAGE && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setCommentPage((p) => Math.max(1, p - 1))}
                disabled={commentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaChevronLeft />
                <span>이전</span>
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {commentPage} / {totalCommentPages}
              </span>
              <button
                onClick={() => setCommentPage((p) => Math.min(totalCommentPages, p + 1))}
                disabled={commentPage === totalCommentPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>다음</span>
                <FaChevronRight />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

