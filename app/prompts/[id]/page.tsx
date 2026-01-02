'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { addComment, deleteComment, getComments, getPromptById, updateComment } from '@/lib/db';
import { Prompt } from '@/types/prompt';
import { getPromptCategoryInfo } from '@/lib/promptCategories';
import { usePromptCategories } from '@/lib/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { FaCalendar, FaCommentDots, FaExternalLinkAlt, FaFeatherAlt, FaLink, FaUser, FaLock, FaEdit, FaTrash, FaPaperPlane, FaChevronLeft, FaChevronRight, FaDownload, FaPaperclip, FaCopy, FaCheck } from 'react-icons/fa';
import { deletePrompt } from '@/lib/db';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Comment } from '@/types/comment';
import { downloadPromptAttachment } from '@/lib/storage';

const COMMENTS_PER_PAGE = 5;

export default function PromptDetailPage() {
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);
  const markdownComponents = {
    h1: (props: any) => <h1 className="text-3xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100" {...props} />,
    h2: (props: any) => <h2 className="text-2xl font-semibold mt-5 mb-3 text-gray-900 dark:text-gray-100" {...props} />,
    h3: (props: any) => <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100" {...props} />,
    p: (props: any) => <p className="leading-relaxed mb-3 last:mb-0" {...props} />,
    ul: (props: any) => <ul className="list-disc list-outside pl-5 space-y-1 mb-3 last:mb-0" {...props} />,
    ol: (props: any) => <ol className="list-decimal list-outside pl-5 space-y-1 mb-3 last:mb-0" {...props} />,
    li: (props: any) => <li className="leading-relaxed" {...props} />,
    code: (props: any) => {
      const { inline, className, children } = props;
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
  const { user, signInWithGoogle } = useAuth();
  const { categories: promptCategories } = usePromptCategories();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentPage, setCommentPage] = useState(1);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);

  useEffect(() => {
    loadPrompt();
    loadComments();
  }, [params.id]);

  const loadPrompt = async () => {
    setLoading(true);
    try {
      const data = await getPromptById(params.id as string);
      setPrompt(data);
    } catch (error) {
      console.error('Error loading prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const data = await getComments(params.id as string, 'prompt');
      setComments(data);
      setCommentPage(1);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  useEffect(() => {
    const total = Math.ceil(comments.length / COMMENTS_PER_PAGE) || 1;
    setCommentPage((prev) => Math.min(prev, total));
  }, [comments.length]);

  const handleSubmitComment = async () => {
    if (!user || !prompt || !newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addComment(prompt.id, 'prompt', newComment.trim(), user.uid, user.displayName || '익명');
      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('댓글 작성 중 오류가 발생했습니다.');
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
      await updateComment(editingId, editingContent.trim());
      setEditingId(null);
      setEditingContent('');
      await loadComments();
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('댓글 수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await deleteComment(commentId);
      await loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('댓글 삭제 중 오류가 발생했습니다.');
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
        <Link href="/prompts" className="text-emerald-600 hover:underline">
          프롬프트 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const categoryInfo = getPromptCategoryInfo(prompt.category, promptCategories);
  const CategoryIcon = categoryInfo.icon;
  const isOwner = user?.uid === prompt.createdBy;
  const parsedSns = prompt.snsUrls.map((entry) => {
    const parts = entry.split(':');
    if (parts.length >= 2) {
      const label = parts.shift()?.trim() || '';
      const url = parts.join(':').trim();
      return { label, url };
    }
    return { label: '', url: entry };
  });

  const totalCommentPages = Math.ceil(comments.length / COMMENTS_PER_PAGE) || 1;
  const startIdx = (commentPage - 1) * COMMENTS_PER_PAGE;
  const paginatedComments = comments.slice(startIdx, startIdx + COMMENTS_PER_PAGE);

  const getLinkPreview = (url: string, label?: string) => {
    const blogFallback = '/naver-blog.svg';
    const etcFallback = '/blog-placeholder.svg';
    const instagramFallback = '/instagram-icon.svg';
    const youtubeFallback = '/youtube.svg';
    const defaultFallback = '/globe.svg';

    const labelText = (label || '').trim();
    const isEtcLink = labelText === '링크';

    const extractUrl = (raw: string) => {
      const httpMatch = raw.match(/https?:\/\/[^\s]+/);
      if (httpMatch) return httpMatch[0];
      const afterColon = raw.split(':').slice(1).join(':').trim();
      if (afterColon) return afterColon;
      return raw.trim();
    };

    const normalizeUrl = (raw: string) => {
      try {
        return new URL(raw);
      } catch {
        return new URL(`https://${raw}`);
      }
    };

    try {
      const parsed = normalizeUrl(extractUrl(url));
      const hostname = parsed.hostname.replace('www.', '');
      const host = hostname.toLowerCase();
      const isBlog = host.includes('blog.') || host.includes('naver.com') || host.includes('tistory') || host.includes('medium.com');
      const isInstagram = host.includes('instagram.com');
      const isYoutube = host.includes('youtube.com') || host.includes('youtu.be');

      const useBlogPlaceholder = isEtcLink || isBlog;

      const fallback = isInstagram
        ? instagramFallback
        : useBlogPlaceholder
          ? isEtcLink ? etcFallback : blogFallback
          : isYoutube
            ? youtubeFallback
            : defaultFallback;
      const favicon = isInstagram || useBlogPlaceholder || isYoutube
        ? fallback
        : `https://www.google.com/s2/favicons?sz=128&domain=${parsed.hostname}`;

      const icon = isInstagram
        ? 'instagram'
        : useBlogPlaceholder
          ? isEtcLink
            ? 'blog-placeholder'
            : 'blog'
          : isYoutube
            ? 'youtube'
            : undefined;
      return { hostname, favicon, fallback, icon };
    } catch {
      const fallback = isEtcLink ? etcFallback : defaultFallback;
      return {
        hostname: url,
        favicon: fallback,
        fallback,
      };
    }
  };

  const handleDelete = async () => {
    if (!prompt || !isOwner) return;
    if (!confirm('정말 이 프롬프트를 삭제하시겠습니까?')) return;
    setDeleting(true);
    try {
      await deletePrompt(prompt.id);
      alert('프롬프트가 삭제되었습니다.');
      router.push('/prompts');
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadAttachment = async (storagePath: string, filename: string, fallbackUrl?: string) => {
    if (!user) return;
    setDownloadingPath(storagePath);
    try {
      const idToken = await user.getIdToken();
      await downloadPromptAttachment(storagePath, filename, idToken, fallbackUrl);
    } catch (error) {
      console.error('Error generating download link:', error);
      alert('다운로드 링크 생성 중 오류가 발생했습니다.');
    } finally {
      setDownloadingPath(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="relative w-full h-64 bg-gradient-to-br from-emerald-200 to-blue-200 dark:from-emerald-900/30 dark:to-blue-900/20">
            {prompt.thumbnailUrl && !imageError ? (
              <Image
                src={prompt.thumbnailUrl}
                alt={prompt.name}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <CategoryIcon className="text-white text-7xl drop-shadow-lg" />
              </div>
            )}
            <div className="absolute top-4 right-4">
              <span className="px-4 py-2 rounded-full bg-white/80 dark:bg-gray-900/80 text-gray-800 dark:text-gray-100 text-sm font-semibold shadow">
                {categoryInfo.label}
              </span>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white">
                    <FaFeatherAlt />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <FaUser className="text-emerald-500" />
                      <span>{prompt.createdByName}</span>
                    </div>
                    <span className="text-gray-300 dark:text-gray-700">•</span>
                    <div className="flex items-center space-x-2">
                      <FaCalendar className="text-emerald-400" />
                      <span>{new Date(prompt.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {prompt.name}
                </h1>
              </div>
            </div>

            <div className="prose prose-emerald dark:prose-invert max-w-none text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {prompt.description}
              </ReactMarkdown>
            </div>

            {!user ? (
              <div className="p-6 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                  <FaLock />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">로그인 후 프롬프트와 링크를 볼 수 있습니다</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">가입자 전용 정보입니다. 로그인하면 전체 프롬프트와 SNS 링크가 공개됩니다.</p>
                </div>
                <button
                  onClick={signInWithGoogle}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold shadow hover:opacity-90 transition"
                >
                  Google 로그인
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                  <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-100 mb-2 flex items-center space-x-2">
                    <FaLink />
                    <span>프롬프트 본문</span>
                  </h2>
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(prompt.promptContent);
                          setCopiedBlock('prompt-content');
                          setTimeout(() => setCopiedBlock((prev) => (prev === 'prompt-content' ? null : prev)), 1200);
                        } catch (error) {
                          console.error('Failed to copy prompt content:', error);
                        }
                      }}
                      className="absolute top-3 right-3 flex items-center gap-1 rounded-md bg-gray-900/80 text-white text-xs px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition"
                    >
                      {copiedBlock === 'prompt-content' ? <FaCheck /> : <FaCopy />}
                      <span>{copiedBlock === 'prompt-content' ? '복사됨' : '복사'}</span>
                    </button>
                    <pre className="overflow-x-auto rounded-xl bg-gray-900 text-gray-100 text-sm p-4 border border-gray-800 whitespace-pre-wrap">
                      <code>{prompt.promptContent}</code>
                    </pre>
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
                              {(file.size / 1024 / 1024).toFixed(2)}MB · {file.contentType || '파일'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(file.storagePath, file.name, file.downloadUrl)}
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

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center space-x-2">
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
              </div>
            )}

            <div className="flex justify-end">
              <div className="flex gap-2">
                {isOwner && (
                  <>
                    <button
                      onClick={() => router.push(`/prompts/${prompt.id}/edit`)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <FaEdit />
                      <span>수정</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-60"
                    >
                      <FaTrash />
                      <span>{deleting ? '삭제 중...' : '삭제'}</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => router.push('/prompts')}
                  className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  목록으로 돌아가기
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 댓글 */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 p-6">
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
                const isAuthor = user?.uid === comment.createdBy;
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
