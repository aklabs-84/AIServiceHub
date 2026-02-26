'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { db, getBrowserClient } from '@/lib/database';
import type { AIApp, Comment, Attachment, AppUrlItem } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useOneTimeAccess } from '@/contexts/OneTimeAccessContext';
import { getCategoryInfo } from '@/lib/categories';
import { useAppCategories } from '@/lib/useCategories';
import { formatFileSize, getProxiedImageUrl } from '@/lib/format';
import PWAInstallButton from '@/components/PWAInstallButton';
import {
  FaExternalLinkAlt, FaEdit, FaTrash, FaUser, FaHeart, FaRegHeart,
  FaCalendar, FaCommentDots, FaPaperPlane, FaChevronLeft, FaChevronRight,
  FaPaperclip, FaDownload, FaLock, FaSave, FaPlus, FaGlobe, FaGripVertical, FaLink
} from 'react-icons/fa';

const COMMENTS_PER_PAGE = 5;
const MAX_ATTACHMENT_SIZE_MB = 10;
const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/xml',
  'text/xml',
  'text/html',
  'application/javascript',
  'text/javascript',
  'application/json',
  'text/json',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const detectUrls = (value: string) =>
  value
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter(Boolean);

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
    img: ({ src, alt, ...props }) => {
      if (!src) return null;
      const imageUrl = typeof src === 'string' ? getProxiedImageUrl(src) : '';
      if (!imageUrl) return null;
      return <img src={imageUrl} alt={alt} className="rounded-lg max-w-full h-auto mb-4" {...props} />;
    },
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

  // --- Inline Edit States ---
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    appUrls: AppUrlItem[];
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
  const urlDragIndexRef = useRef<number | null>(null);

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
  // --- End of Edit States ---

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

  const toggleEdit = () => {
    if (!isEditing && app) {
      setFormData({
        name: app.name,
        description: app.description,
        appUrls: app.appUrls && app.appUrls.length > 0
          ? app.appUrls
          : [{ url: '', isPublic: true, label: '이동하기' }],
        category: app.category,
        isPublic: app.isPublic ?? true,
        thumbnailUrl: app.thumbnailUrl || '',
        thumbnailPositionX: typeof app.thumbnailPositionX === 'number' ? app.thumbnailPositionX : 50,
        thumbnailPositionY: typeof app.thumbnailPositionY === 'number' ? app.thumbnailPositionY : 50,
        tags: app.tags || [],
      });
      setTagInput(app.tags?.join(', ') || '');
      hydrateSnsForm(app.snsUrls || []);
      setExistingAttachments(app.attachments || []);
      setAttachments([]);
      setAttachmentError(null);
    }
    setIsEditing(!isEditing);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hydrateSnsForm = (snsUrls: string[]) => {
    const next = { blog: '', instagram: '', tiktok: '', youtube: '', etc: [] as string[] };
    snsUrls.forEach((entry) => {
      const parts = entry.split(':');
      const label = parts.shift()?.trim().toLowerCase() || '';
      const url = parts.join(':').trim();
      if (label.includes('blog') || label.includes('네이버')) next.blog = url || entry;
      else if (label.includes('insta') || label.includes('인스타')) next.instagram = url || entry;
      else if (label.includes('tik') || label.includes('틱톡')) next.tiktok = url || entry;
      else if (label.includes('you') || label.includes('유튜')) next.youtube = url || entry;
      else next.etc.push(entry);
    });
    setSnsForm({
      blog: next.blog,
      instagram: next.instagram,
      tiktok: next.tiktok,
      youtube: next.youtube,
      etc: next.etc.join('\n'),
    });
  };

  const buildSnsUrls = () => {
    const urls: string[] = [];
    const push = (label: string, url: string) => {
      const trimmed = url.trim();
      if (trimmed) urls.push(`${label}: ${trimmed}`);
    };
    push('네이버 블로그', snsForm.blog);
    push('인스타그램', snsForm.instagram);
    push('틱톡', snsForm.tiktok);
    push('유튜브', snsForm.youtube);
    detectUrls(snsForm.etc).forEach((entry) => {
      urls.push(entry.includes(':') ? entry : `링크: ${entry}`);
    });
    return urls;
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setAttachmentError(null);
    const next = files.filter((file) => {
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        setAttachmentError(`파일 크기는 ${MAX_ATTACHMENT_SIZE_MB}MB 이하만 가능합니다.`);
        return false;
      }
      if (file.type && !ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
        setAttachmentError('허용되지 않는 파일 형식입니다.');
        return false;
      }
      return true;
    });
    if (next.length) setAttachments((prev) => [...prev, ...next]);
    event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const addUrlField = () => {
    if (!formData) return;
    setFormData({
      ...formData,
      appUrls: [...formData.appUrls, { url: '', isPublic: true, label: '' }],
    });
  };

  const removeUrlField = (index: number) => {
    if (!formData || formData.appUrls.length <= 1) return;
    setFormData({
      ...formData,
      appUrls: formData.appUrls.filter((_, i) => i !== index),
    });
  };

  const updateUrlField = (index: number, updates: Partial<AppUrlItem>) => {
    if (!formData) return;
    setFormData({
      ...formData,
      appUrls: formData.appUrls.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    });
  };

  const moveUrlField = (fromIndex: number, toIndex: number) => {
    if (!formData || fromIndex === toIndex) return;
    const next = [...formData.appUrls];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setFormData({ ...formData, appUrls: next });
  };

  const updateThumbnailPosition = (clientX: number, clientY: number) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect || !formData) return;
    const nextX = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const nextY = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setFormData({
      ...formData,
      thumbnailPositionX: Math.round(nextX),
      thumbnailPositionY: Math.round(nextY),
    });
  };

  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!previewUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    updateThumbnailPosition(event.clientX, event.clientY);
  };

  const handlePreviewPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateThumbnailPosition(event.clientX, event.clientY);
  };

  const handlePreviewPointerUp = () => setIsDragging(false);

  const handleDeleteExistingAttachment = async (attachment: Attachment) => {
    if (!user || !app) return;
    if (!confirm('첨부 파일을 삭제하시겠습니까?')) return;
    setDeletingPath(attachment.storagePath);
    try {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const idToken = session?.access_token;
      if (!idToken) throw new Error('인증 토큰을 찾을 수 없습니다.');
      await db.attachments.deleteFile(attachment.storagePath, 'app', idToken);
      if (attachment.id) await db.attachments.remove(supabase, attachment.id);
      setExistingAttachments((prev) => prev.filter((item) => item.storagePath !== attachment.storagePath));
    } catch (error) {
      console.error('Error deleting attachment:', error);
      showError('첨부 파일 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingPath(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !app || !formData) return;
    if (!isAdmin && user.id !== app.createdBy) {
      showWarning('권한이 없습니다.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const idToken = session?.access_token;
      if (!idToken) throw new Error('인증 토큰을 찾을 수 없습니다.');

      const uploadedAttachments = attachments.length
        ? await Promise.all(attachments.map((file) => db.attachments.uploadFile(file, 'app', idToken)))
        : [];

      const hasThumbnail = !!formData.thumbnailUrl?.trim();
      const validAppUrls = formData.appUrls.filter((u) => u.url.trim().length > 0);

      await db.apps.update(supabase, {
        id: app.id,
        name: formData.name,
        description: formData.description,
        appUrls: validAppUrls,
        snsUrls: buildSnsUrls(),
        category: formData.category,
        isPublic: formData.isPublic,
        thumbnailUrl: hasThumbnail ? formData.thumbnailUrl : undefined,
        thumbnailPositionX: hasThumbnail ? formData.thumbnailPositionX : undefined,
        thumbnailPositionY: hasThumbnail ? formData.thumbnailPositionY : undefined,
        tags: tagInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      });

      if (uploadedAttachments.length > 0) {
        await Promise.all(
          uploadedAttachments.map((file) => db.attachments.create(supabase, app.id, 'app', file, user.id))
        );
      }

      showSuccess('앱이 수정되었습니다!');
      // 인라인 수정을 마친 후 전체 새로고침하여 캐시 문제 해결
      window.location.href = `/apps/${app.id}?updated=${Date.now()}`;
    } catch (error) {
      console.error('Error updating app:', error);
      showError('앱 수정 중 오류가 발생했습니다.');
      setSubmitting(false);
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
      const hostname = parsed.hostname.replace('www.', '');
      const host = hostname.toLowerCase();
      const isBlog = host.includes('blog.') || host.includes('naver.com') || host.includes('tistory') || host.includes('medium.com');
      const useBlogPlaceholder = isEtcLink || isBlog;
      const favicon = useBlogPlaceholder ? blogFallback : `https://www.google.com/s2/favicons?sz=128&domain=${parsed.hostname}`;
      const fallback = useBlogPlaceholder ? blogFallback : defaultFallback;
      return { label, url, hostname, favicon, fallback };
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Top Navigation */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={isEditing ? toggleEdit : goBack}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-bold group"
          >
            <FaChevronLeft className="text-sm group-hover:-translate-x-0.5 transition-transform" />
            <span>{isEditing ? '수정 취소' : '바이브코딩'}</span>
          </button>
          <div className="flex items-center gap-3">
            {isOwner && !isEditing && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-100 dark:border-red-900/30"
                title="삭제하기"
              >
                <FaTrash className="text-sm" />
              </button>
            )}
            {isOwner && isEditing && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
              >
                <FaSave className="text-sm" />
                <span>{submitting ? '저장 중...' : '저장하기'}</span>
              </button>
            )}
            {!isEditing && <PWAInstallButton />}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {isEditing && formData ? (
          /* --- EDIT FORM --- */
          <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Thumbnail Header */}
            <div className="relative group rounded-3xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
              <div
                ref={previewRef}
                onPointerDown={handlePreviewPointerDown}
                onPointerMove={handlePreviewPointerMove}
                onPointerUp={handlePreviewPointerUp}
                onPointerLeave={handlePreviewPointerUp}
                className={`relative w-full aspect-[21/9] sm:aspect-[24/9] bg-gray-100 dark:bg-gray-900 ${previewUrl ? 'cursor-move' : ''} touch-none select-none`}
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
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                      <FaPlus className="text-xl opacity-50" />
                    </div>
                    <span className="text-sm font-medium">배경 이미지 URL을 입력하고 위치를 조정하세요</span>
                  </div>
                )}
                {/* Visual Guide Overlay */}
                {previewUrl && !previewError && (
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/10 flex items-center justify-center">
                    <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs font-medium flex items-center gap-2">
                      <FaGripVertical /> 드래그하여 배경 위치 조정
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Basic Info */}
                <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <FaGlobe className="text-lg" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">기본 정보</h2>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">서비스 명칭</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="이름을 입력하세요"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">카테고리</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                          {categories.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">공개 여부</label>
                        <select
                          value={formData.isPublic ? 'true' : 'false'}
                          onChange={(e) => setFormData({ ...formData, isPublic: e.target.value === 'true' })}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                          <option value="true">공개</option>
                          <option value="false">비공개</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">배경 이미지 URL</label>
                      <input
                        type="url"
                        value={formData.thumbnailUrl}
                        onChange={(e) => {
                          setFormData({ ...formData, thumbnailUrl: e.target.value });
                          setPreviewError(false);
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="https://..."
                      />
                      <p className="mt-2 text-xs text-gray-500">Google Drive, URL 이미지를 지원합니다.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">태그</label>
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="쉼표로 구분 예: AI, 챗봇, 업무효율"
                      />
                    </div>
                  </div>
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                  <div className="flex items-center justify-between font-bold">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <FaLink className="text-lg" />
                      </div>
                      <h2 className="text-xl">실행 및 상세 정보</h2>
                    </div>
                    <button
                      type="button"
                      onClick={addUrlField}
                      className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
                    >
                      <FaPlus />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {formData.appUrls.map((item, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={() => (urlDragIndexRef.current = index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (urlDragIndexRef.current !== null) {
                            moveUrlField(urlDragIndexRef.current, index);
                            urlDragIndexRef.current = null;
                          }
                        }}
                        className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                          <div className="flex-1 space-y-3 w-full">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) => updateUrlField(index, { label: e.target.value })}
                                placeholder="라벨 (예: 실행)"
                                className="w-1/3 px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700 text-sm"
                              />
                              <input
                                type="url"
                                value={item.url}
                                onChange={(e) => updateUrlField(index, { url: e.target.value })}
                                placeholder="https://..."
                                className="flex-1 px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700 text-sm"
                              />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.isPublic}
                                onChange={(e) => updateUrlField(index, { isPublic: e.target.checked })}
                              />
                              <span className="text-xs">전체 공개</span>
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <div className="cursor-grab p-2 text-gray-400"><FaGripVertical /></div>
                            <button type="button" onClick={() => removeUrlField(index)} className="p-2 text-red-400"><FaTrash /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                      <FaCommentDots className="text-lg" />
                    </div>
                    <h2 className="text-xl font-bold">앱 소개</h2>
                  </div>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={10}
                    className="w-full px-4 py-4 rounded-2xl border dark:bg-gray-900 dark:border-gray-700 text-sm"
                    placeholder="Markdown 지원"
                  />
                </section>
              </div>

              <div className="space-y-8">
                <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                  <h3 className="font-bold">SNS 연동</h3>
                  <div className="space-y-4">
                    {['blog', 'instagram', 'tiktok', 'youtube'].map(f => (
                      <input key={f} type="text" value={(snsForm as any)[f]} onChange={e => setSnsForm({ ...snsForm, [f]: e.target.value })} placeholder={f} className="w-full px-3 py-2 rounded-xl border dark:bg-gray-900 dark:border-gray-700 text-xs" />
                    ))}
                  </div>
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><FaPaperclip /> 첨부 파일</h3>
                  <div className="space-y-2">
                    {existingAttachments.map(f => (
                      <div key={f.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <span className="truncate">{f.name}</span>
                        <button type="button" onClick={() => handleDeleteExistingAttachment(f)} className="text-red-400"><FaTrash /></button>
                      </div>
                    ))}
                    {attachments.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                        <span className="truncate">{f.name}</span>
                        <button type="button" onClick={() => removeAttachment(i)} className="text-red-400"><FaTrash /></button>
                      </div>
                    ))}
                    <input type="file" multiple onChange={handleAttachmentChange} className="hidden" id="file-up" />
                    <label htmlFor="file-up" className="block text-center p-4 border-2 border-dashed rounded-xl cursor-pointer text-xs font-bold text-gray-400">파일 추가</label>
                  </div>
                </section>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 pt-4">
              <button type="button" onClick={toggleEdit} className="px-8 py-3 rounded-xl bg-white dark:bg-gray-800 border font-bold">취소</button>
              <button type="submit" disabled={submitting} className="px-12 py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50">저장</button>
            </div>
          </form>
        ) : (
          /* --- DETAIL VIEW --- */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Header Area */}
            <div className="relative group rounded-[2.5rem] overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl">
              <div className="relative w-full aspect-[21/9] sm:aspect-[24/9] overflow-hidden">
                {!!(app.thumbnailUrl && typeof app.thumbnailUrl === 'string' && app.thumbnailUrl.trim() !== '') && !imageError ? (
                  <Image
                    src={getProxiedImageUrl(app.thumbnailUrl)}
                    alt={app.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    style={thumbnailPosition}
                    priority
                    onError={() => setImageError(true)}
                    unoptimized
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center`}>
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
                      {!app.isPublic && (
                        <div className="px-3 py-1 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
                          <FaLock /> 비공개
                        </div>
                      )}
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
                      {app.name}
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
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <FaUser className="text-xl" />
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">조성자</div>
                        <div className="text-gray-900 dark:text-white font-black">{app.createdByName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isOwner && (
                        <button onClick={toggleEdit} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95 shadow-sm">
                          <FaEdit className="text-blue-500" /> 수정하기
                        </button>
                      )}
                      <button
                        onClick={handleLike}
                        disabled={isLiking || !user}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-sm ${isLiked ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-900/30' : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}
                      >
                        {isLiked ? <FaHeart className="text-red-500 animate-pulse" /> : <FaRegHeart />} {likeCount}
                      </button>
                    </div>
                  </div>

                  <div className="mt-10 space-y-10">
                    {app.description && (
                      <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                          {app.description}
                        </ReactMarkdown>
                      </div>
                    )}
                    {app.tags && app.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {app.tags.map((t, i) => <span key={i} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs font-bold">#{t}</span>)}
                      </div>
                    )}
                    {app.appUrls && app.appUrls.length > 0 && (
                      <div className="pt-8 border-t dark:border-gray-800">
                        {user ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {app.appUrls.map((u, i) => (
                              <Link key={i} href={u.url} target="_blank" className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border flex justify-between items-center group">
                                <div>
                                  <div className="text-[10px] text-gray-400 font-bold uppercase">{getDomainLabel(u.url)}</div>
                                  <div className="font-bold dark:text-white">{u.label || '바로가기'}</div>
                                </div>
                                <FaChevronRight className="group-hover:translate-x-1 transition-transform" />
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-dashed border-blue-200 dark:border-blue-800 text-center space-y-4">
                            <FaLock className="mx-auto text-3xl text-blue-400 opacity-50" />
                            <div><div className="font-bold text-blue-900 dark:text-blue-100">로그인이 필요한 콘텐츠입니다</div><div className="text-sm text-blue-600 dark:text-blue-400 mt-1">로그인 후 앱 실행 링크를 확인하실 수 있습니다.</div></div>
                            <div className="flex justify-center gap-2">
                              <button onClick={signInWithKakao} className="px-5 py-2.5 rounded-xl bg-[#FEE500] text-black font-bold text-sm shadow-sm active:scale-95 transition-all">카카오 로그인</button>
                              <button onClick={signInWithGoogle} className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm shadow-sm active:scale-95 transition-all">구글 로그인</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Column */}
              <div className="space-y-8">
                <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                  <h3 className="font-black flex items-center gap-2 text-gray-900 dark:text-white">
                    <FaExternalLinkAlt className="text-blue-500" /> SNS / 채널
                  </h3>
                  {app.snsUrls && app.snsUrls.length > 0 ? (
                    <div className="space-y-3">
                      {app.snsUrls.map((s, i) => {
                        const { label, url, favicon, hostname, fallback } = getLinkPreview(s);
                        return (
                          <Link key={i} href={url} target="_blank" className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all shadow-sm group">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center border dark:border-gray-800 overflow-hidden">
                              <img
                                src={favicon}
                                alt={label}
                                className="w-6 h-6 object-contain"
                                onError={(e) => (e.currentTarget.src = fallback)}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase truncate tracking-tight">{hostname}</div>
                              <div className="font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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

                  {app.attachments && app.attachments.length > 0 && (
                    <div className="pt-8 border-t dark:border-gray-800 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                        <FaPaperclip className="text-blue-500" />
                        첨부 파일 ({app.attachments.length})
                      </div>
                      {user ? (
                        <div className="space-y-3">
                          {app.attachments.map((file) => (
                            <button
                              key={file.id}
                              onClick={() => handleDownloadAttachment(file.storagePath, file.name)}
                              disabled={downloadingPath === file.storagePath}
                              className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-left group"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 rounded-lg bg-white dark:bg-gray-900 border dark:border-gray-800 text-blue-500 group-hover:scale-110 transition-transform">
                                  <FaDownload className="text-xs" />
                                </div>
                                <div className="overflow-hidden">
                                  <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{file.name}</div>
                                  <div className="text-[10px] text-gray-400 font-medium">{formatFileSize(file.size)}</div>
                                </div>
                              </div>
                              {downloadingPath === file.storagePath && (
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 mt-8">
          <div className="flex items-center gap-2 mb-5">
            <FaCommentDots className="text-blue-500" />
            <h3 className="text-sm font-black text-gray-900 dark:text-white">댓글</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">({comments.length})</span>
          </div>

          {user ? (
            <div className="flex gap-4 mb-5">
              <div className="relative flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="당신의 의견을 나누어보세요..."
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[120px] transition-all"
                />
                <div className="absolute bottom-4 right-4">
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <FaPaperPlane /> <span>댓글 등록</span>
                      </>
                    )}
                  </button>
                </div>
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
                const isEditingComment = editingId === comment.id;
                return (
                  <div key={comment.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-bold text-gray-800 dark:text-gray-200">{comment.createdByName}</span>
                      <span>{comment.createdAt.toLocaleString('ko-KR')}</span>
                    </div>
                    {isEditingComment ? (
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
                    {isAuthor && !isEditingComment && (
                      <div className="flex gap-2 justify-end text-xs">
                        <button onClick={() => handleEditComment(comment)} className="px-3 py-1 rounded-lg border text-gray-500 hover:bg-gray-100 transition">수정</button>
                        <button onClick={() => handleDeleteComment(comment.id)} className="px-3 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition">삭제</button>
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
                className="p-2 border rounded-lg disabled:opacity-50"
              >
                <FaChevronLeft className="text-xs" />
              </button>
              <span className="text-xs">{commentPage} / {totalCommentPages}</span>
              <button
                onClick={() => setCommentPage((p) => Math.min(totalCommentPages, p + 1))}
                disabled={commentPage === totalCommentPages}
                className="p-2 border rounded-lg disabled:opacity-50"
              >
                <FaChevronRight className="text-xs" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
