'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAppById, deleteApp, likeApp, unlikeApp, addComment, getComments, updateComment, deleteComment } from '@/lib/db';
import { AIApp } from '@/types/app';
import { Comment } from '@/types/comment';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryInfo } from '@/lib/categories';
import { useAppCategories } from '@/lib/useCategories';
import { downloadAppAttachment } from '@/lib/storage';
import { FaExternalLinkAlt, FaEdit, FaTrash, FaLock, FaUser, FaHeart, FaRegHeart, FaCalendar, FaCommentDots, FaPaperPlane, FaChevronLeft, FaChevronRight, FaPaperclip, FaDownload } from 'react-icons/fa';

const COMMENTS_PER_PAGE = 5;

export default function AppDetailPage() {
  const markdownComponents = {
    h1: (props: any) => <h1 className="text-3xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100" {...props} />,
    h2: (props: any) => <h2 className="text-2xl font-semibold mt-5 mb-3 text-gray-900 dark:text-gray-100" {...props} />,
    h3: (props: any) => <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100" {...props} />,
    p: (props: any) => <p className="leading-relaxed mb-3 last:mb-0" {...props} />,
    ul: (props: any) => <ul className="list-disc list-outside pl-5 space-y-1 mb-3 last:mb-0" {...props} />,
    ol: (props: any) => <ol className="list-decimal list-outside pl-5 space-y-1 mb-3 last:mb-0" {...props} />,
    li: (props: any) => <li className="leading-relaxed" {...props} />,
  };

  const params = useParams();
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const { categories } = useAppCategories();
  const [app, setApp] = useState<AIApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentPage, setCommentPage] = useState(1);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);

  const thumbnailPosition = app
    ? { objectPosition: `${app.thumbnailPositionX ?? 50}% ${app.thumbnailPositionY ?? 50}%` }
    : undefined;

  useEffect(() => {
    loadApp();
    loadComments();
  }, [params.id]);

  const loadApp = async () => {
    setLoading(true);
    try {
      const data = await getAppById(params.id as string);
      setApp(data);
      if (data) {
        setIsLiked(user ? data.likes.includes(user.uid) : false);
        setLikeCount(data.likeCount);
      }
    } catch (error) {
      console.error('Error loading app:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const data = await getComments(params.id as string, 'app');
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
    if (!user || !app || !newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addComment(app.id, 'app', newComment.trim(), user.uid, user.displayName || '익명');
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

  const handleLike = async () => {
    if (!user || !app || isLiking) return;

    setIsLiking(true);
    try {
      if (isLiked) {
        await unlikeApp(app.id, user.uid);
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        await likeApp(app.id, user.uid);
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

    if (!confirm('정말 이 앱을 삭제하시겠습니까?')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteApp(app.id);
      alert('앱이 삭제되었습니다.');
      router.push('/');
    } catch (error) {
      console.error('Error deleting app:', error);
      alert('앱 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadAttachment = async (storagePath: string, filename: string, fallbackUrl?: string) => {
    if (!user) {
      alert('로그인 후 다운로드할 수 있습니다.');
      return;
    }
    setDownloadingPath(storagePath);
    try {
      const idToken = await user.getIdToken();
      await downloadAppAttachment(storagePath, filename, idToken, fallbackUrl);
    } catch (error) {
      console.error('Failed to download attachment:', error);
      alert('첨부 파일 다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloadingPath(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          앱을 찾을 수 없습니다
        </h1>
        <Link href="/" className="text-blue-600 hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const categoryInfo = getCategoryInfo(app.category, categories);
  const CategoryIcon = categoryInfo.icon;
  const isOwner = user?.uid === app.createdBy;
  const parsedSns = app.snsUrls.map((entry) => {
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
      const favicon = useBlogPlaceholder
        ? blogFallback
        : `https://www.google.com/s2/favicons?sz=128&domain=${parsed.hostname}`;

      return { hostname, favicon, fallback };
    } catch {
      return {
        hostname: url,
        favicon: isEtcLink ? blogFallback : defaultFallback,
        fallback: isEtcLink ? blogFallback : defaultFallback,
      };
    }
  };

  // 로그인하지 않은 경우
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* 공개 정보 */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden mb-8 border border-gray-200 dark:border-gray-800">
            <div className="relative w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
              {app.thumbnailUrl && !imageError ? (
                <Image
                  src={app.thumbnailUrl}
                  alt={app.name}
                  fill
                  className="object-cover"
                  style={thumbnailPosition}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${categoryInfo.color}`}>
                  <CategoryIcon className="text-white text-8xl" />
                </div>
              )}
            </div>

            <div className="p-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                  {app.name}
                </h1>
                <span className={`px-4 py-2 rounded-full text-white ${categoryInfo.color}`}>
                  {categoryInfo.label}
                </span>
              </div>

              <div className="prose prose-slate dark:prose-invert max-w-none text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {app.description || ''}
                </ReactMarkdown>
              </div>

              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <FaUser className="text-purple-500" />
                    <span>{app.createdByName}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <FaCalendar className="text-blue-500" />
                    <span>{new Date(app.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-red-500 text-lg">
                  <FaHeart />
                  <span className="font-semibold">{likeCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 로그인 필요 안내 */}
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 rounded-lg p-8 text-center">
            <FaLock className="text-yellow-600 dark:text-yellow-500 text-4xl mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              로그인이 필요합니다
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              앱의 상세 정보와 URL을 확인하려면 Google 계정으로 로그인해주세요.
            </p>
            <button
              onClick={signInWithGoogle}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Google 로그인
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 로그인한 경우 - 전체 정보 표시
  const totalCommentPages = Math.ceil(comments.length / COMMENTS_PER_PAGE) || 1;
  const startIdx = (commentPage - 1) * COMMENTS_PER_PAGE;
  const paginatedComments = comments.slice(startIdx, startIdx + COMMENTS_PER_PAGE);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="relative w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
            {app.thumbnailUrl && !imageError ? (
              <Image
                src={app.thumbnailUrl}
                alt={app.name}
                fill
                className="object-cover"
                style={thumbnailPosition}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${categoryInfo.color}`}>
                <CategoryIcon className="text-white text-8xl" />
              </div>
            )}
          </div>

          <div className="p-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                {app.name}
              </h1>
              <span className={`px-4 py-2 rounded-full text-white ${categoryInfo.color}`}>
                {categoryInfo.label}
              </span>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {app.description || ''}
              </ReactMarkdown>
            </div>

            {/* 메타 정보 */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <FaUser className="text-purple-500" />
                  <span>{app.createdByName}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <FaCalendar className="text-blue-500" />
                  <span>{new Date(app.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  isLiked
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLiked ? <FaHeart /> : <FaRegHeart />}
                <span className="font-semibold">{likeCount}</span>
              </button>
            </div>

            {/* 앱 URL */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                앱 URL
              </h2>
              <a
                href={app.appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center space-x-2"
              >
                <span className="break-all">{app.appUrl}</span>
                <FaExternalLinkAlt className="flex-shrink-0" />
              </a>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center space-x-2">
                <FaPaperclip />
                <span>첨부 파일</span>
              </h2>
              {app.attachments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">등록된 파일이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {app.attachments.map((file) => (
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
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                      >
                        <FaDownload />
                        {downloadingPath === file.storagePath ? '준비 중...' : '다운로드'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {!user && app.attachments.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  로그인 후 파일을 다운로드할 수 있습니다.
                </p>
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
                    return (
                      <a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md transition"
                      >
                        <div className="relative h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                          <Image
                            src={preview.favicon}
                            alt={item.label || preview.hostname}
                            fill
                            sizes="40px"
                            className="object-contain"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.src.includes(preview.fallback)) {
                                target.src = preview.fallback;
                              }
                            }}
                          />
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

            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
              <div></div>

              {isOwner && (
                <div className="flex space-x-3">
                  <Link
                    href={`/apps/${app.id}/edit`}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <FaEdit />
                    <span>수정</span>
                  </Link>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
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
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaCommentDots className="text-blue-500" />
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
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submitting}
                  className="h-full px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50"
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
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
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

        <div className="mt-6">
          <Link
            href="/apps"
            className="text-blue-600 hover:underline"
          >
            ← 목록으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
