'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createApp } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { AppCategory, AppUrlItem } from '@/types/app';
import { useAppCategories } from '@/lib/useCategories';
import { FaPaperclip, FaSave, FaPlus, FaTrash, FaGlobe, FaLock, FaLink } from 'react-icons/fa';
import { sendSlackNotification } from '@/lib/notifications';
import { uploadAppAttachment } from '@/lib/storage';
import { useToast } from '@/contexts/ToastContext';

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

export default function NewAppPage() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const { categories } = useAppCategories();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;  // Strict Mode 대응: 마운트 시 true로 설정
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  interface AppFormData {
    name: string;
    description: string;
    appUrls: AppUrlItem[];
    category: AppCategory;
    isPublic: boolean;
    thumbnailUrl: string;
    thumbnailPositionX: number;
    thumbnailPositionY: number;
    createdByName: string;
    tags: string[];
  }

  const [formData, setFormData] = useState<AppFormData>({
    name: '',
    description: '',
    appUrls: [{ url: '', isPublic: true, label: '' }],
    category: 'chatbot' as AppCategory,
    isPublic: true,
    thumbnailUrl: '',
    thumbnailPositionX: 50,
    thumbnailPositionY: 50,
    createdByName: (user?.user_metadata?.full_name || user?.user_metadata?.name) || '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
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
      setFormData((prev) => ({ ...prev, category: categories[0].value as AppCategory }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showInfo('로그인이 필요합니다.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const idToken = session?.access_token;
      if (!idToken) throw new Error('인증 토큰을 찾을 수 없습니다.');
      if (attachmentError) {
        showError(attachmentError);
        return;
      }
      const uploadedAttachments = attachments.length
        ? await Promise.all(attachments.map((file) => uploadAppAttachment(file, idToken)))
        : [];
      const hasThumbnail = formData.thumbnailUrl.trim().length > 0;
      const validAppUrls = formData.appUrls.filter((u) => u.url.trim().length > 0);

      const appId = await createApp(
        {
          name: formData.name,
          description: formData.description,
          appUrls: validAppUrls,
          snsUrls: buildSnsUrls(),
          category: formData.category,
          isPublic: formData.isPublic,
          thumbnailUrl: hasThumbnail ? formData.thumbnailUrl : undefined,
          thumbnailPositionX: hasThumbnail ? formData.thumbnailPositionX : undefined,
          thumbnailPositionY: hasThumbnail ? formData.thumbnailPositionY : undefined,
          attachments: uploadedAttachments,
          createdByName: formData.createdByName || (user.user_metadata?.full_name || user.user_metadata?.name) || '익명',
          tags: tagInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        },
        user.id
      );

      if (isMountedRef.current) {
        showSuccess('앱이 등록되었습니다!');
        router.replace(`/apps/${appId}`);
      }
      sendSlackNotification({
        type: 'app',
        id: appId,
        name: formData.name,
        author: formData.createdByName || (user.user_metadata?.full_name || user.user_metadata?.name) || '익명',
        url: formData.appUrls[0]?.url || '',
      });
    } catch (error) {
      console.error('Error creating app:', error);
      if (isMountedRef.current) {
        showError('앱 등록 중 오류가 발생했습니다.');
      }
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
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

  // 로그인하지 않은 경우
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          로그인이 필요합니다
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          앱을 등록하려면 Google 계정으로 로그인해주세요.
        </p>
        <button
          onClick={signInWithGoogle}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Google 로그인
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8">
          새 앱 등록
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

          {/* 첨부 파일 */}
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
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm"
                  >
                    <span className="truncate">
                      {file.name} · {(file.size / 1024 / 1024).toFixed(2)}MB
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

          {/* 카테고리 */}
          <div className="mb-6">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as AppCategory })}
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

          {/* 공개 설정 */}
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

          {/* 작성자 이름 */}
          <div className="mb-6">
            <label htmlFor="createdByName" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              작성자 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="createdByName"
              required
              value={formData.createdByName}
              onChange={(e) => setFormData({ ...formData, createdByName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="닉네임 또는 이름을 입력하세요"
            />
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
              <span>{submitting ? '등록 중...' : '등록하기'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
