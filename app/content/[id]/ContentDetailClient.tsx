'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Send, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getBrowserClient, db } from '@/lib/database';
import type { Post, Comment } from '@/types/database';

interface Props {
  post: Post;
  initialComments: Comment[];
}

function getUserName(user: { user_metadata?: { full_name?: string; name?: string }; email?: string } | null) {
  if (!user) return '';
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
}

function getUserAvatar(user: { user_metadata?: { avatar_url?: string; picture?: string } } | null) {
  return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || undefined;
}

function formatDate(date: Date) {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return m <= 0 ? '방금 전' : `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

export default function ContentDetailClient({ post, initialComments }: Props) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { showError } = useToast();
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [liked, setLiked] = useState(user ? post.likes.includes(user.id) : false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canDeletePost = !!user && (user.id === post.authorId || isAdmin);

  const handleDeletePost = async () => {
    if (!canDeletePost || deletingPost) return;
    if (!window.confirm('이 글을 삭제하시겠습니까? 댓글과 좋아요도 함께 삭제됩니다.')) return;
    setDeletingPost(true);
    const client = getBrowserClient();
    try {
      await db.posts.remove(client, post.id);
      router.push('/content');
    } catch (e) {
      showError(e instanceof Error ? e.message : '글 삭제 실패');
      setDeletingPost(false);
    }
  };

  const handleLike = async () => {
    if (!user || likeLoading) return;
    setLikeLoading(true);
    const client = getBrowserClient();
    try {
      if (liked) {
        await db.posts.unlike(client, post.id, user.id);
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        await db.posts.like(client, post.id, user.id);
        setLiked(true);
        setLikeCount((c) => c + 1);
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : '좋아요 처리 실패');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleComment = async () => {
    if (!user || !commentText.trim() || submitting) return;
    setSubmitting(true);
    const client = getBrowserClient();
    try {
      const name = getUserName(user);
      const avatar = getUserAvatar(user);
      const id = await db.comments.create(client, post.id, 'post', commentText.trim(), user.id, name, avatar);
      const newComment: Comment = {
        id,
        targetId: post.id,
        targetType: 'post',
        content: commentText.trim(),
        createdBy: user.id,
        createdByName: name,
        createdByAvatarUrl: avatar,
        createdAt: new Date(),
      };
      setComments((prev) => [newComment, ...prev]);
      setCommentText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (e) {
      showError(e instanceof Error ? e.message : '댓글 작성 실패');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const client = getBrowserClient();
    try {
      await db.comments.remove(client, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      showError(e instanceof Error ? e.message : '댓글 삭제 실패');
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommentText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className="mt-8 space-y-6">
      {/* 좋아요 + 삭제 */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={handleLike}
          disabled={!user || likeLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            liked
              ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-rose-200 hover:text-rose-500'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {likeLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          }
          <span>{likeCount > 0 ? likeCount : ''} 좋아요</span>
        </button>

        <span className="flex items-center gap-1.5 text-sm text-gray-400">
          <MessageCircle className="w-4 h-4" />
          댓글 {comments.length}
        </span>

        {canDeletePost && (
          <button
            onClick={handleDeletePost}
            disabled={deletingPost}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all disabled:opacity-40"
          >
            {deletingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span>글 삭제</span>
          </button>
        )}
      </div>

      {/* 댓글 섹션 */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
          댓글 {comments.length > 0 ? `(${comments.length})` : ''}
        </h3>

        {/* 댓글 입력 */}
        {user ? (
          <div className="flex gap-3 mb-6">
            {getUserAvatar(user) ? (
              <Image src={getUserAvatar(user)!} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" unoptimized />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {getUserName(user)[0]}
              </div>
            )}
            <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
              <textarea
                ref={textareaRef}
                value={commentText}
                onChange={handleTextareaInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment();
                }}
                placeholder="댓글을 입력하세요…"
                rows={1}
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none outline-none"
              />
              <div className="flex justify-end px-2 pb-2">
                <button
                  onClick={handleComment}
                  disabled={!commentText.trim() || submitting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  게시
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-600 mb-6">
            로그인 후 댓글을 작성할 수 있습니다.
          </p>
        )}

        {/* 댓글 목록 */}
        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">
            첫 번째 댓글을 남겨보세요
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => {
              const canDelete = user && (user.id === c.createdBy || isAdmin);
              return (
                <div key={c.id} className="flex gap-3 group">
                  {c.createdByAvatarUrl ? (
                    <Image src={c.createdByAvatarUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" unoptimized />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-bold shrink-0">
                      {c.createdByName[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{c.createdByName}</span>
                      <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="opacity-0 group-hover:opacity-100 ml-auto text-gray-300 hover:text-rose-500 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 whitespace-pre-wrap break-words">
                      {c.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
