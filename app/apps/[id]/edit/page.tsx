'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, getBrowserClient } from '@/lib/database';
import type { AIApp, Attachment, AppUrlItem } from '@/types/database';
import { useAppCategories } from '@/lib/useCategories';
import { FaSave, FaPaperclip, FaDownload, FaPlus, FaTrash, FaGlobe, FaLock, FaLink } from 'react-icons/fa';
import { useToast } from '@/contexts/ToastContext';
import { formatFileSize } from '@/lib/format';

const detectUrls = (value: string) =>
  value
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter(Boolean);

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

export default function EditAppPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const { categories } = useAppCategories();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [app, setApp] = useState<AIApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  interface AppFormData {
    name: string;
    description: string;
    appUrls: AppUrlItem[];
    category: string;
    isPublic: boolean;
    thumbnailUrl: string;
    thumbnailPositionX: number;
    thumbnailPositionY: number;
    tags: string[];
  }

  const [formData, setFormData] = useState<AppFormData>({
    name: '',
    description: '',
    appUrls: [{ url: '', isPublic: true, label: '' }],
    category: 'chatbot',
    isPublic: true,
    thumbnailUrl: '',
    thumbnailPositionX: 50,
    thumbnailPositionY: 50,
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [snsForm, setSnsForm] = useState({
    blog: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    etc: '',
  });
  const [isDragging, setIsDragging] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const previewUrl = useMemo(() => {
    const raw = formData.thumbnailUrl.trim();
    if (!raw) return '';

    const driveMatch = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    if (driveMatch?.[1]) {
      return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
    }
    const driveIdParam = raw.match(/[?&]id=([^&]+)/i);
    if (raw.includes('drive.google.com') && driveIdParam?.[1]) {
      return `https://drive.google.com/uc?export=view&id=${driveIdParam[1]}`;
    }

    return raw;
  }, [formData.thumbnailUrl]);

  const previewImageSrc = useMemo(() => {
    if (!previewUrl) return '';
    const isDrive = previewUrl.includes('drive.google.com');
    return isDrive
      ? `/api/image-proxy?url=${encodeURIComponent(previewUrl)}`
      : previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    if (categories.length === 0) return;
    if (!categories.find((cat) => cat.value === formData.category)) {
      setFormData((prev) => ({ ...prev, category: categories[0].value }));
    }
  }, [categories, formData.category]);

  useEffect(() => {
    if (!previewUrl) {
      setPreviewError(false);
      return;
    }
    setPreviewError(false);
  }, [previewUrl]);

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
    if (next.length) {
      setAttachments((prev) => [...prev, ...next]);
    }
    event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const addUrlField = () => {
    setFormData((prev) => ({
      ...prev,
      appUrls: [...prev.appUrls, { url: '', isPublic: true, label: '' }],
    }));
  };

  const removeUrlField = (index: number) => {
    if (formData.appUrls.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      appUrls: prev.appUrls.filter((_, i) => i !== index),
    }));
  };

  const updateUrlField = (index: number, updates: Partial<{ url: string; isPublic: boolean; label: string }>) => {
    setFormData((prev) => ({
      ...prev,
      appUrls: prev.appUrls.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    }));
  };

  const hydrateSnsForm = (snsUrls: string[]) => {
    const next = { blog: '', instagram: '', tiktok: '', youtube: '', etc: [] as string[] };
    snsUrls.forEach((entry) => {
      const parts = entry.split(':');
      const label = parts.shift()?.trim().toLowerCase() || '';
      const url = parts.join(':').trim();
      if (label.includes('blog') || label.includes('네이버')) {
        next.blog = url || entry;
      } else if (label.includes('insta') || label.includes('인스타')) {
        next.instagram = url || entry;
      } else if (label.includes('tik') || label.includes('틱톡')) {
        next.tiktok = url || entry;
      } else if (label.includes('you') || label.includes('유튜')) {
        next.youtube = url || entry;
      } else {
        next.etc.push(entry);
      }
    });
    setSnsForm({
      blog: next.blog,
      instagram: next.instagram,
      tiktok: next.tiktok,
      youtube: next.youtube,
      etc: next.etc.join('\n'),
    });
  };

  const loadApp = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getBrowserClient();
      const data = await db.apps.getById(supabase, params.id as string);
      if (data) {
        setApp(data);
        setFormData({
          name: data.name,
          description: data.description,
          appUrls: data.appUrls && data.appUrls.length > 0
            ? data.appUrls
            : [{ url: '', isPublic: true, label: '이동하기' }],
          category: data.category,
          isPublic: data.isPublic ?? true,
          thumbnailUrl: data.thumbnailUrl || '',
          thumbnailPositionX: typeof data.thumbnailPositionX === 'number' ? data.thumbnailPositionX : 50,
          thumbnailPositionY: typeof data.thumbnailPositionY === 'number' ? data.thumbnailPositionY : 50,
          tags: data.tags || [],
        });
        setTagInput(data.tags?.join(', ') || '');
        hydrateSnsForm(data.snsUrls || []);
        setExistingAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error('Error loading app:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadApp();
  }, [loadApp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !app) {
      showError('권한이 없습니다.');
      return;
    }

    if (user.id !== app.createdBy && !isAdmin) {
      showWarning('앱 소유자만 수정할 수 있습니다.');
      return;
    }

    setSubmitting(true);
    try {
      if (attachmentError) {
        showError(attachmentError);
        return;
      }
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const idToken = session?.access_token;
      if (!idToken) throw new Error('인증 토큰을 찾을 수 없습니다.');
      const uploadedAttachments = attachments.length
        ? await Promise.all(attachments.map((file) => db.attachments.uploadFile(file, 'app', idToken)))
        : [];
      const hasThumbnail = formData.thumbnailUrl.trim().length > 0;
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

      // Save newly uploaded attachments to the attachments table
      if (uploadedAttachments.length > 0 && user?.id) {
        await Promise.all(
          uploadedAttachments.map((file) =>
            db.attachments.create(supabase, app.id, 'app', file, user.id)
          )
        );
      }

      showSuccess('앱이 수정되었습니다!');
      router.replace(`/apps/${app.id}`);
    } catch (error) {
      console.error('Error updating app:', error);
      showError('앱 수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadAttachment = async (storagePath: string, filename: string, fallbackUrl?: string) => {
    if (!user) return;
    setDownloadingPath(storagePath);
    try {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const idToken = session?.access_token;
      if (!idToken) throw new Error('인증 토큰을 찾을 수 없습니다.');
      await db.attachments.downloadFile(storagePath, filename, 'app', idToken, fallbackUrl);
    } catch (error) {
      console.error('Error generating download link:', error);
      showError('다운로드 링크 생성 중 오류가 발생했습니다.');
    } finally {
      setDownloadingPath(null);
    }
  };

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
      if (attachment.id) {
        await db.attachments.remove(supabase, attachment.id);
      }
      const nextAttachments = existingAttachments.filter((item) => item.storagePath !== attachment.storagePath);
      setExistingAttachments(nextAttachments);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      showError('첨부 파일 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingPath(null);
    }
  };

  const updateThumbnailPosition = (clientX: number, clientY: number) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextX = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const nextY = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setFormData((prev) => ({
      ...prev,
      thumbnailPositionX: Math.round(nextX),
      thumbnailPositionY: Math.round(nextY),
    }));
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

  const handlePreviewPointerUp = () => {
    setIsDragging(false);
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
      </div>
    );
  }

  if (!user || user.id !== app.createdBy) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          권한이 없습니다
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          앱 소유자만 수정할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8">
          앱 수정
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-800"
        >
          {/* 앱 이름 */}
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              앱 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: AI 챗봇 어시스턴트"
            />
          </div>

          {/* SNS/채널 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
              SNS/채널 링크
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="url"
                placeholder="네이버 블로그 URL"
                value={snsForm.blog}
                onChange={(e) => setSnsForm({ ...snsForm, blog: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="url"
                placeholder="인스타그램 URL"
                value={snsForm.instagram}
                onChange={(e) => setSnsForm({ ...snsForm, instagram: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="url"
                placeholder="틱톡 URL"
                value={snsForm.tiktok}
                onChange={(e) => setSnsForm({ ...snsForm, tiktok: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="url"
                placeholder="유튜브 URL"
                value={snsForm.youtube}
                onChange={(e) => setSnsForm({ ...snsForm, youtube: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <textarea
              rows={2}
              placeholder="기타 링크가 있다면 입력하세요 (한 줄에 하나씩)"
              value={snsForm.etc}
              onChange={(e) => setSnsForm({ ...snsForm, etc: e.target.value })}
              className="mt-3 w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              입력한 순서대로 카드/상세 화면에 보여집니다.
            </p>
          </div>

          {/* 설명 */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              설명 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="앱에 대한 설명을 입력하세요"
            />
          </div>

          {/* 앱 URL (다중) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                웹 URL <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addUrlField}
                className="flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
              >
                <FaPlus className="text-[10px]" />
                <span>URL 추가</span>
              </button>
            </div>

            <div className="space-y-4">
              {formData.appUrls.map((urlItem, index) => (
                <div key={index} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <FaLink className="text-sm" />
                      </div>
                      <input
                        type="url"
                        required={index === 0}
                        value={urlItem.url}
                        onChange={(e) => updateUrlField(index, { url: e.target.value })}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="https://aistudio.google.com/..."
                      />
                    </div>
                    {formData.appUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeUrlField(index)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="삭제"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={urlItem.label}
                        onChange={(e) => updateUrlField(index, { label: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-950 text-xs text-gray-600 dark:text-gray-400 focus:ring-1 focus:ring-blue-500"
                        placeholder="URL 라벨 (예: 메인 앱, 관리자 페이지 등)"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => updateUrlField(index, { isPublic: !urlItem.isPublic })}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition-all text-[11px] font-bold ${urlItem.isPublic
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                        : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                        }`}
                    >
                      {urlItem.isPublic ? (
                        <>
                          <FaGlobe className="text-[10px]" />
                          <span>전체 공개</span>
                        </>
                      ) : (
                        <>
                          <FaLock className="text-[10px]" />
                          <span>작성자만 공개</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 pl-1">
              • Google AI Studio에서 공유한 앱 URL을 입력하세요.<br />
              • 비공개로 설정된 URL은 본인과 관리자만 볼 수 있습니다.
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="attachments" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              첨부 파일 (선택)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="attachments"
                type="file"
                multiple
                accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
                onChange={handleAttachmentChange}
                className="w-full px-4 py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <FaPaperclip className="text-gray-400" />
            </div>
            {attachmentError && (
              <p className="text-xs text-red-500 mt-2">{attachmentError}</p>
            )}
            {existingAttachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {existingAttachments.map((file) => (
                  <div
                    key={file.storagePath}
                    className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm"
                  >
                    <span className="truncate">
                      {file.name} · {formatFileSize(file.size)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(file.storagePath, file.name)}
                        disabled={downloadingPath === file.storagePath}
                        className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-60"
                      >
                        <span className="inline-flex items-center gap-1">
                          <FaDownload />
                          {downloadingPath === file.storagePath ? '준비 중...' : '다운로드'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingAttachment(file)}
                        disabled={deletingPath === file.storagePath}
                        className="text-xs text-red-500 hover:text-red-600 disabled:opacity-60"
                      >
                        {deletingPath === file.storagePath ? '삭제 중...' : '삭제'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm"
                  >
                    <span className="truncate">
                      {file.name} · {formatFileSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      제거
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              최대 {MAX_ATTACHMENT_SIZE_MB}MB, PDF/텍스트/ZIP/DOCX/PNG/JPG만 가능합니다.
            </p>
          </div>

          {/* 카테고리 */}
          <div className="mb-6">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* 태그 */}
          <div className="mb-6">
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              태그 (쉼표로 구분)
            </label>
            <input
              type="text"
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="AI, 챗봇, 자동화"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              관련 키워드를 입력하면 검색과 분류에 도움이 됩니다.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              공개 설정 <span className="text-red-500">*</span>
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPublic: true })}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${formData.isPublic
                  ? 'bg-blue-600 text-white border-blue-600 shadow'
                  : 'bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                공개
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPublic: false })}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${!formData.isPublic
                  ? 'bg-blue-600 text-white border-blue-600 shadow'
                  : 'bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                비공개
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              비공개로 설정하면 작성자만 볼 수 있습니다.
            </p>
          </div>

          {/* 썸네일 URL (선택) */}
          <div className="mb-6">
            <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              썸네일 이미지 URL (선택)
            </label>
            <input
              type="url"
              id="thumbnailUrl"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              입력하지 않으면 카테고리 아이콘이 표시됩니다
            </p>
          </div>

          {/* 썸네일 위치 조정 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              썸네일 위치 (이미지에서 직접 조정)
            </label>
            <div
              ref={previewRef}
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={handlePreviewPointerUp}
              onPointerLeave={handlePreviewPointerUp}
              className={`relative w-full h-48 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${previewUrl
                ? 'cursor-crosshair'
                : 'bg-gray-100 dark:bg-gray-800'
                }`}
            >
              {!previewUrl && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  썸네일 URL을 입력하면 미리보기가 표시됩니다
                </div>
              )}
              {previewUrl && !previewError && (
                <>
                  <Image
                    src={previewImageSrc}
                    alt="썸네일 미리보기"
                    fill
                    unoptimized
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      objectPosition: `${formData.thumbnailPositionX}% ${formData.thumbnailPositionY}%`,
                    }}
                    onError={() => setPreviewError(true)}
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-black/10" />
                  <div
                    className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md bg-blue-500/80"
                    style={{
                      left: `${formData.thumbnailPositionX}%`,
                      top: `${formData.thumbnailPositionY}%`,
                    }}
                  />
                </>
              )}
              {previewUrl && previewError && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  이미지를 불러올 수 없습니다. URL을 확인해주세요.
                </div>
              )}
            </div>
            <div className="space-y-4 mt-4">
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>좌</span>
                  <span>{formData.thumbnailPositionX}%</span>
                  <span>우</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.thumbnailPositionX}
                  disabled={!formData.thumbnailUrl.trim()}
                  onChange={(e) => setFormData({ ...formData, thumbnailPositionX: Number(e.target.value) })}
                  className="w-full accent-blue-600 disabled:opacity-50"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>상</span>
                  <span>{formData.thumbnailPositionY}%</span>
                  <span>하</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.thumbnailPositionY}
                  disabled={!formData.thumbnailUrl.trim()}
                  onChange={(e) => setFormData({ ...formData, thumbnailPositionY: Number(e.target.value) })}
                  className="w-full accent-blue-600 disabled:opacity-50"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              썸네일 이미지가 있을 때만 적용됩니다.
            </p>
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <FaSave />
              <span>{submitting ? '수정 중...' : '수정하기'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
