'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { db, getBrowserClient } from '@/lib/database';
import type { Prompt, Attachment, AttachmentRow } from '@/types/database';
import { getPromptCategoryInfo } from '@/lib/promptCategories';
import { usePromptCategories } from '@/lib/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { useOneTimeAccess } from '@/contexts/OneTimeAccessContext';
import {
  FaCalendar, FaCommentDots, FaExternalLinkAlt, FaFeatherAlt, FaLink, FaUser, FaLock, FaEdit, FaTrash,
  FaPaperPlane, FaChevronLeft, FaChevronRight, FaDownload, FaPaperclip, FaCopy, FaCheck, FaHeart, FaRegHeart,
  FaSave, FaPlus, FaGlobe, FaGripVertical
} from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Comment } from '@/types/database';
import { useToast } from '@/contexts/ToastContext';
import { formatFileSize, getProxiedImageUrl } from '@/lib/format';

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
    img: ({ src, alt, ...props }) => {
      if (!src) return null;
      const imageUrl = typeof src === 'string' ? getProxiedImageUrl(src) : '';
      if (!imageUrl) return null;
      return <img src={imageUrl} alt={alt} className="rounded-lg max-w-full h-auto mb-4" {...props} />;
    },
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

  // --- Inline Edit States ---
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    promptContent: string;
    category: string;
    isPublic: boolean;
    thumbnailUrl: string;
    thumbnailPositionX: number;
    thumbnailPositionY: number;
    tags: string[];
  } | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [snsForm, setSnsForm] = useState({
    blog: '', instagram: '', tiktok: '', youtube: '', etc: '',
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const previewUrl = useMemo(() => {
    if (!formData?.thumbnailUrl) return '';
    const raw = formData.thumbnailUrl.trim();
    if (!raw) return '';
    const driveMatch = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    if (driveMatch?.[1]) return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
    const driveIdParam = raw.match(/[?&]id=([^&]+)/i);
    if (raw.includes('drive.google.com') && driveIdParam?.[1]) return `https://drive.google.com/uc?export=view&id=${driveIdParam[1]}`;
    return raw;
  }, [formData?.thumbnailUrl]);

  const previewImageSrc = useMemo(() => {
    return getProxiedImageUrl(previewUrl);
  }, [previewUrl]);

  const toggleEdit = () => {
    if (!prompt) return;
    if (!isEditing) {
      setFormData({
        name: prompt.name,
        description: prompt.description || '',
        promptContent: prompt.promptContent || '',
        category: prompt.category || '',
        isPublic: prompt.isPublic !== false,
        thumbnailUrl: prompt.thumbnailUrl || '',
        thumbnailPositionX: prompt.thumbnailPositionX ?? 50,
        thumbnailPositionY: prompt.thumbnailPositionY ?? 50,
        tags: prompt.tags || [],
      });
      setTagInput((prompt.tags || []).join(', '));
      hydrateSnsForm(prompt.snsUrls);
      setExistingAttachments(prompt.attachments || []);
      setAttachments([]);
      setAttachmentError(null);
      setPreviewError(false);
    }
    setIsEditing(!isEditing);
  };

  const hydrateSnsForm = (urls: string[]) => {
    const next = { blog: '', instagram: '', tiktok: '', youtube: '', etc: '' };
    const etcs: string[] = [];
    urls.forEach(u => {
      const parts = u.split(':');
      if (parts.length >= 2) {
        const label = parts[0].trim();
        const val = parts.slice(1).join(':').trim();
        if (label === '네이버 블로그') next.blog = val;
        else if (label === '인스타그램') next.instagram = val;
        else if (label === '틱톡') next.tiktok = val;
        else if (label === '유튜브') next.youtube = val;
        else etcs.push(u);
      } else {
        etcs.push(u);
      }
    });
    next.etc = etcs.join('\n');
    setSnsForm(next);
  };

  const buildSnsUrls = () => {
    const urls: string[] = [];
    const push = (label: string, url: string) => {
      const v = url.trim();
      if (v) urls.push(`${label}: ${v}`);
    };
    push('네이버 블로그', snsForm.blog);
    push('인스타그램', snsForm.instagram);
    push('틱톡', snsForm.tiktok);
    push('유튜브', snsForm.youtube);
    snsForm.etc.split(/[\n,]/).map(v => v.trim()).filter(Boolean).forEach(v => {
      urls.push(v.includes(':') ? v : `링크: ${v}`);
    });
    return urls;
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setAttachmentError(null);
    const MAX_SIZE = 10 * 1024 * 1024;
    const next = files.filter(f => {
      if (f.size > MAX_SIZE) { setAttachmentError('파일 크기는 10MB 이하만 가능합니다.'); return false; }
      return true;
    });
    if (next.length) setAttachments(prev => [...prev, ...next]);
    e.target.value = '';
  };

  const handleDeleteExistingAttachment = async (file: Attachment) => {
    if (!user || !prompt || !confirm('첨부 파일을 삭제하시겠습니까?')) return;
    setDeletingPath(file.storagePath);
    try {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const idToken = session?.access_token;
      if (!idToken) throw new Error('인증 토큰을 찾을 수 없습니다.');
      await db.attachments.deleteFile(file.storagePath, 'prompt', idToken);
      if (file.id) await db.attachments.remove(supabase, file.id);
      setExistingAttachments(prev => prev.filter(a => a.id !== file.id));
    } catch (error) {
      console.error('Delete attachment error:', error);
      showError('첨부 파일 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingPath(null);
    }
  };

  const updateThumbnailPosition = (clientX: number, clientY: number) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect || !formData) return;
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setFormData({ ...formData, thumbnailPositionX: Math.round(x), thumbnailPositionY: Math.round(y) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !prompt || !formData) return;
    setSubmitting(true);
    try {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const idToken = session?.access_token;
      if (!idToken) throw new Error('인증 토큰을 찾을 수 없습니다.');

      const uploaded = attachments.length
        ? await Promise.all(attachments.map(f => db.attachments.uploadFile(f, 'prompt', idToken)))
        : [];

      await db.prompts.update(supabase, {
        id: prompt.id,
        name: formData.name,
        description: formData.description,
        promptContent: formData.promptContent,
        snsUrls: buildSnsUrls(),
        category: formData.category,
        isPublic: formData.isPublic,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        thumbnailPositionX: formData.thumbnailPositionX,
        thumbnailPositionY: formData.thumbnailPositionY,
        tags: tagInput.split(',').map(t => t.trim()).filter(Boolean),
      });

      if (uploaded.length) {
        await Promise.all(uploaded.map(f => db.attachments.create(supabase, prompt.id, 'prompt', f, user.id)));
      }
      showSuccess('프롬프트가 수정되었습니다!');
      window.location.href = `/prompts/${prompt.id}?updated=${Date.now()}`;
    } catch (error) {
      console.error('Update prompt error:', error);
      showError('프롬프트 수정 중 오류가 발생했습니다.');
      setSubmitting(false);
    }
  };

  const goBack = () => {
    const lastUrl = sessionStorage.getItem('lastPromptsListUrl');
    router.push(lastUrl || '/prompts');
  };

  const getDomainLabel = (url: string) => {
    try {
      const hostname = new URL(url).hostname.replace('www.', '').split('.')[0];
      return hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch { return '웹사이트'; }
  };

  const getLinkPreview = (input: string) => {
    let label = '';
    let url = input.trim();
    if (input.includes(':')) {
      const parts = input.split(':');
      label = parts.shift()?.trim() || '';
      url = parts.join(':').trim();
    }
    const blogFallback = '/blog-placeholder.svg';
    const defaultFallback = '/globe.svg';
    const labelText = label.toLowerCase();
    const isEtcLink = labelText === '링크' || !label;
    try {
      const parsed = new URL(url);
      const isBlog = parsed.hostname.includes('blog.') || parsed.hostname.includes('naver.com') || parsed.hostname.includes('tistory');
      const useBlogPlaceholder = isEtcLink || isBlog;
      const favicon = useBlogPlaceholder ? blogFallback : `https://www.google.com/s2/favicons?sz=128&domain=${parsed.hostname}`;
      const fallback = useBlogPlaceholder ? blogFallback : defaultFallback;
      return { label, url, hostname: parsed.hostname.replace('www.', ''), favicon, fallback };
    } catch {
      return { label, url, hostname: url, favicon: isEtcLink ? blogFallback : defaultFallback, fallback: isEtcLink ? blogFallback : defaultFallback };
    }
  };

  const LinkIcon = ({ label }: { label: string }) => {
    const l = label.toLowerCase();
    if (l.includes('blog') || l.includes('블로그')) return <FaGlobe />;
    if (l.includes('insta') || l.includes('인스타')) return <FaLink />;
    if (l.includes('tik') || l.includes('틱톡')) return <FaLink />;
    if (l.includes('you') || l.includes('유튜')) return <FaExternalLinkAlt />;
    return <FaLink />;
  };

  const handleDownloadAttachment = async (storagePath: string, filename: string) => {
    if (!user) { showWarning('로그인 후 다운로드할 수 있습니다.'); return; }
    setDownloadingPath(storagePath);
    try {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const idToken = session?.access_token;
      if (!idToken) throw new Error('인증 토큰을 찾을 수 없습니다.');
      await db.attachments.downloadFile(storagePath, filename, 'prompt', idToken);
    } catch (error) {
      console.error('Download error:', error);
      showError('첨부 파일 다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloadingPath(null);
    }
  };

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
    if (!initialCommentsLoaded) loadComments();
  }, [loadComments, initialCommentsLoaded]);

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
    if (!prompt || !confirm('정말로 삭제하시겠습니까?')) return;
    setDeleting(true);
    try {
      const supabase = getBrowserClient();
      await db.prompts.remove(supabase, prompt.id);
      showSuccess('프롬프트가 삭제되었습니다.');
      router.push('/prompts');
    } catch (error) {
      console.error('Delete prompt error:', error);
      showError('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">프롬프트를 찾을 수 없습니다</h1>
        <Link href="/" className="text-emerald-600 hover:underline">홈으로 돌아가기</Link>
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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">비공개 프롬프트입니다</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">작성자만 볼 수 있는 프롬프트입니다.</p>
        <Link href="/prompts" className="text-emerald-600 hover:underline">프롬프트 목록으로 돌아가기</Link>
      </div>
    );
  }

  const totalCommentPages = Math.ceil(comments.length / COMMENTS_PER_PAGE) || 1;
  const startIdx = (commentPage - 1) * COMMENTS_PER_PAGE;
  const paginatedComments = comments.slice(startIdx, startIdx + COMMENTS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={isEditing ? toggleEdit : goBack} className="flex items-center gap-2 text-gray-700 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-bold group">
            <FaChevronLeft className="text-sm group-hover:-translate-x-0.5 transition-transform" />
            <span>{isEditing ? '수정 취소' : '프롬프트'}</span>
          </button>
          <div className="flex items-center gap-3">
            {isOwner && !isEditing && (
              <button onClick={handleDelete} disabled={deleting} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-100 dark:border-red-900/30">
                <FaTrash className="text-sm" />
              </button>
            )}
            {isOwner && isEditing && (
              <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50">
                <FaSave className="text-sm" />
                <span>{submitting ? '저장 중...' : '저장하기'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {isEditing && formData ? (
          <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative group rounded-3xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
              <div
                ref={previewRef}
                onPointerDown={(e) => { setIsDragging(true); e.currentTarget.setPointerCapture(e.pointerId); updateThumbnailPosition(e.clientX, e.clientY); }}
                onPointerMove={(e) => { if (isDragging) updateThumbnailPosition(e.clientX, e.clientY); }}
                onPointerUp={(e) => { setIsDragging(false); e.currentTarget.releasePointerCapture(e.pointerId); }}
                className={`relative w-full aspect-[21/9] bg-gray-100 dark:bg-gray-900 ${previewUrl ? 'cursor-move' : ''} touch-none select-none`}
              >
                {previewUrl && !previewError ? (
                  <Image
                    src={previewImageSrc}
                    alt="Thumbnail preview"
                    fill
                    className="object-cover transition-opacity duration-300"
                    style={{ objectPosition: `${formData.thumbnailPositionX}% ${formData.thumbnailPositionY}%` }}
                    onError={() => setPreviewError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-3">
                    <FaPlus className="text-xl opacity-50" />
                    <span className="text-sm font-medium">배경 이미지 URL을 입력하고 위치를 조정하세요</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <FaFeatherAlt className="text-lg" />
                    </div>
                    <h2 className="text-xl font-bold">기본 정보</h2>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold mb-2">프롬프트 명칭</label>
                      <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-2">카테고리</label>
                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none">
                          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">공개 여부</label>
                        <select value={formData.isPublic ? 'true' : 'false'} onChange={(e) => setFormData({ ...formData, isPublic: e.target.value === 'true' })} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none">
                          <option value="true">공개</option>
                          <option value="false">비공개</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">배경 이미지 URL</label>
                      <input type="url" value={formData.thumbnailUrl} onChange={(e) => { setFormData({ ...formData, thumbnailUrl: e.target.value }); setPreviewError(false); }} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none" placeholder="https://..." />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">태그</label>
                      <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none" placeholder="태그, 태그2..." />
                    </div>
                  </div>
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <FaCommentDots className="text-lg" />
                    </div>
                    <h2 className="text-xl font-bold">상세 설명 (Markdown)</h2>
                  </div>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full h-64 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-mono text-sm" />
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <FaLink className="text-lg" />
                    </div>
                    <h2 className="text-xl font-bold">프롬프트 본문</h2>
                  </div>
                  <textarea value={formData.promptContent} onChange={(e) => setFormData({ ...formData, promptContent: e.target.value })} className="w-full h-64 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-mono text-sm" placeholder="프롬프트 내용을 입력하세요" />
                </section>
              </div>

              <div className="space-y-8">
                <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                  <h3 className="font-bold flex items-center gap-2"><FaExternalLinkAlt /> SNS / 마켓</h3>
                  <div className="space-y-4">
                    {['blog', 'instagram', 'tiktok', 'youtube'].map(key => (
                      <div key={key}>
                        <label className="block text-xs font-bold mb-1 opacity-60 uppercase">{key}</label>
                        <input type="url" value={(snsForm as any)[key]} onChange={(e) => setSnsForm({ ...snsForm, [key]: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none" placeholder="https://..." />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-bold mb-1 opacity-60 uppercase">기타 링크 (한 줄에 하나)</label>
                      <textarea value={snsForm.etc} onChange={(e) => setSnsForm({ ...snsForm, etc: e.target.value })} className="w-full h-24 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none resize-none" placeholder="제목: URL 또는 URL" />
                    </div>
                  </div>
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                  <h3 className="font-bold flex items-center gap-2"><FaPaperclip /> 첨부 파일</h3>
                  <div className="space-y-3">
                    {existingAttachments.map(f => (
                      <div key={f.id} className="flex items-center justify-between p-2 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <span className="text-xs truncate max-w-[150px]">{f.name}</span>
                        <button type="button" onClick={() => handleDeleteExistingAttachment(f)} disabled={deletingPath === f.storagePath} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                          {deletingPath === f.storagePath ? <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <FaTrash className="text-xs" />}
                        </button>
                      </div>
                    ))}
                    {attachments.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-blue-100 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        <span className="text-xs truncate max-w-[150px]">{f.name}</span>
                        <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 hover:bg-blue-100 rounded-md transition-colors"><FaTrash className="text-xs" /></button>
                      </div>
                    ))}
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer group">
                      <FaPlus className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
                      <span className="text-xs text-gray-500 mt-2">파일 추가 (10MB)</span>
                      <input type="file" multiple onChange={handleAttachmentChange} className="hidden" />
                    </label>
                    {attachmentError && <p className="text-[10px] text-red-500 font-medium">{attachmentError}</p>}
                  </div>
                </section>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Hero Header Area */}
            <div className="relative group rounded-[2.5rem] overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl">
              <div className="relative w-full aspect-[21/9] sm:aspect-[24/9] overflow-hidden">
                {prompt.thumbnailUrl && !imageError ? (
                  <Image
                    src={getProxiedImageUrl(prompt.thumbnailUrl)}
                    alt={prompt.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{ objectPosition: `${prompt.thumbnailPositionX ?? 50}% ${prompt.thumbnailPositionY ?? 50}%` }}
                    onError={() => setImageError(true)}
                    priority unoptimized
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 flex items-center justify-center`}>
                    <CategoryIcon className="text-8xl opacity-10" />
                  </div>
                )}
                {/* Overlay Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 pointer-events-none">
                  <div className="max-w-3xl space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold flex items-center gap-2">
                        <CategoryIcon className="text-sm" /> {categoryInfo.label}
                      </div>
                      {!isPublic && (
                        <div className="px-3 py-1 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
                          <FaLock /> 비공개
                        </div>
                      )}
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
                      {prompt.name}
                    </h1>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                        <FaUser className="text-xl" />
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">조성자</div>
                        <div className="text-gray-900 dark:text-white font-black">{prompt.createdByName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isOwner && (
                        <button onClick={toggleEdit} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95 shadow-sm">
                          <FaEdit className="text-emerald-500" /> 수정하기
                        </button>
                      )}
                      <button
                        onClick={handleLike}
                        disabled={isLiking}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-sm ${isLiked ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-900/30' : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}
                      >
                        {isLiked ? <FaHeart className="text-red-500 animate-pulse" /> : <FaRegHeart />} {likeCount}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                      <div className="w-1 h-4 bg-emerald-500 rounded-full" /> 프롬프트 소개
                    </div>
                    <div className="prose prose-emerald dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-black prose-img:rounded-2xl">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{prompt.description || ''}</ReactMarkdown>
                    </div>
                    {prompt.tags && prompt.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-4">
                        {prompt.tags.map(t => (
                          <Link key={t} href={`/prompts?tag=${encodeURIComponent(t)}`} className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all font-medium">#{t}</Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-8 border-t dark:border-gray-800 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                      <FaLink className="text-emerald-500" /> 프롬프트 본문
                    </div>
                    {user ? (
                      <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800/50 font-mono text-sm group relative overflow-hidden">
                        <div className="whitespace-pre-wrap leading-relaxed relative z-10">{prompt.promptContent}</div>
                        <div className="absolute top-4 right-4 z-20">
                          <button onClick={() => { navigator.clipboard.writeText(prompt.promptContent); showSuccess('프롬프트가 복사되었습니다.'); }} className="p-3 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-500 dark:text-gray-400 shadow-sm hover:text-emerald-600 dark:hover:text-emerald-400 transition-all active:scale-95 group/btn">
                            <FaCopy className="text-lg group-hover/btn:scale-110 transition-transform" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-dashed border-emerald-200 dark:border-emerald-800 text-center space-y-4">
                        <FaLock className="mx-auto text-3xl text-emerald-400 opacity-50" />
                        <div><div className="font-bold text-emerald-900 dark:text-emerald-100">로그인이 필요한 콘텐츠입니다</div><div className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">로그인 후 프롬프트 본문과 첨부 파일을 확인하실 수 있습니다.</div></div>
                        <div className="flex justify-center gap-2">
                          <button onClick={signInWithKakao} className="px-5 py-2.5 rounded-xl bg-[#FEE500] text-black font-bold text-sm shadow-sm active:scale-95 transition-all">카카오 로그인</button>
                          <button onClick={signInWithGoogle} className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm shadow-sm active:scale-95 transition-all">구글 로그인</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                  <h3 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white"><FaExternalLinkAlt className="text-emerald-500" /> SNS / 채널</h3>
                  {prompt.snsUrls && prompt.snsUrls.length > 0 ? (
                    <div className="space-y-3">
                      {prompt.snsUrls.map((s, i) => {
                        const { label, url, favicon, hostname, fallback } = getLinkPreview(s);
                        return (
                          <Link key={i} href={url} target="_blank" className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all shadow-sm group">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center border dark:border-gray-800 overflow-hidden">
                              <img src={favicon} alt={label} className="w-6 h-6 object-contain" onError={(e) => (e.currentTarget.src = fallback)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase truncate tracking-tight">{hostname}</div>
                              <div className="font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                <LinkIcon label={label || hostname} />
                                {label || '바로가기'}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-sm text-gray-400">등록된 SNS 링크가 없습니다.</p>
                  )}

                  {prompt.attachments && prompt.attachments.length > 0 && (
                    <div className="pt-8 border-t dark:border-gray-800 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                        <FaPaperclip className="text-emerald-500" />
                        첨부 파일 ({prompt.attachments.length})
                      </div>
                      {user ? (
                        <div className="space-y-3">
                          {prompt.attachments.map((file) => (
                            <button
                              key={file.id}
                              onClick={() => handleDownloadAttachment(file.storagePath, file.name)}
                              disabled={downloadingPath === file.storagePath}
                              className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-left group"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 rounded-lg bg-white dark:bg-gray-900 border dark:border-gray-800 text-emerald-500 group-hover:scale-110 transition-transform">
                                  <FaDownload className="text-xs" />
                                </div>
                                <div className="overflow-hidden">
                                  <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{file.name}</div>
                                  <div className="text-[10px] text-gray-400 font-medium">{formatFileSize(file.size)}</div>
                                </div>
                              </div>
                              {downloadingPath === file.storagePath && (
                                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed dark:border-gray-800 text-center text-xs text-gray-400 italic">로그인 후 다운로드 가능</div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <FaCommentDots className="text-xl" />
                  </div>
                  <h3 className="text-xl font-bold flex items-center gap-2">댓글 <span className="text-emerald-500">{comments.length}</span></h3>
                </div>
              </div>

              {user ? (
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="당신의 의견을 나누어보세요..." className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none resize-none min-h-[120px] transition-all" />
                    <div className="absolute bottom-4 right-4">
                      <button onClick={handleSubmitComment} disabled={!newComment.trim() || submitting} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/25">
                        {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><FaPaperPlane /> <span>댓글 등록</span></>}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-dashed dark:border-gray-700 text-center text-gray-400 font-medium">댓글을 작성하려면 로그인이 필요합니다.</div>
              )}

              <div className="space-y-4">
                {paginatedComments.length > 0 ? (
                  paginatedComments.map((comment) => {
                    const isAuthor = user?.id === comment.createdBy;
                    const isEditing = editingId === comment.id;
                    return (
                      <div key={comment.id} className="p-6 rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-400 font-bold text-xs uppercase">{comment.createdByName?.[0]}</div>
                            <div>
                              <div className="text-sm font-bold">{comment.createdByName}</div>
                              <div className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString('ko-KR')}</div>
                            </div>
                          </div>
                          {isAuthor && !isEditing && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingId(comment.id); setEditingContent(comment.content); }} className="p-2 text-gray-400 hover:text-emerald-500 transition-colors"><FaEdit className="text-xs" /></button>
                              <button onClick={() => handleDeleteComment(comment.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><FaTrash className="text-xs" /></button>
                            </div>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="space-y-3">
                            <textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-emerald-500 outline-none resize-none" rows={3} />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-500">취소</button>
                              <button onClick={handleUpdateComment} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold">저장</button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{comment.content}</div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-12 text-gray-400 text-sm">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
                )}
              </div>

              {totalCommentPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-4">
                  <button onClick={() => setCommentPage(p => Math.max(1, p - 1))} disabled={commentPage === 1} className="p-2 rounded-xl border dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"><FaChevronLeft className="text-xs" /></button>
                  <span className="text-xs font-bold text-gray-400">{commentPage} / {totalCommentPages}</span>
                  <button onClick={() => setCommentPage(p => Math.min(totalCommentPages, p + 1))} disabled={commentPage === totalCommentPages} className="p-2 rounded-xl border dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"><FaChevronRight className="text-xs" /></button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
