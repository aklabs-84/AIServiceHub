'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Course, ResourceLink, LocationType } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import TagInput from '@/components/TagInput';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import Link from 'next/link';

interface Props {
  mode: 'new' | 'edit';
  initialData?: Course;
}

interface FormData {
  title: string;
  description: string;
  content: string;
  scheduleAt: string;
  durationMinutes: number;
  locationType: LocationType;
  locationDetail: string;
  capacity: number;
  price: number;
  isPaid: boolean;
  isPublic: boolean;
  thumbnailUrl: string;
  tags: string[];
  resourceUrl: string;
  resourceUrls: ResourceLink[];
}

const DEFAULT_FORM: FormData = {
  title: '',
  description: '',
  content: '',
  scheduleAt: '',
  durationMinutes: 60,
  locationType: 'online',
  locationDetail: '',
  capacity: 0,
  price: 0,
  isPaid: false,
  isPublic: true,
  thumbnailUrl: '',
  tags: [],
  resourceUrl: '',
  resourceUrls: [],
};

export default function CourseFormPage({ mode, initialData }: Props) {
  const router = useRouter();
  const { user, session, isAdmin, loading } = useAuth();
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 관리자가 아니면 리다이렉트
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace('/classes');
    }
  }, [loading, user, isAdmin, router]);

  // 수정 모드: initialData 로드
  useEffect(() => {
    if (initialData) {
      const s = initialData.scheduleAt;
      setForm({
        title: initialData.title,
        description: initialData.description,
        content: initialData.content,
        scheduleAt: s ? new Date(s.getTime() - s.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
        durationMinutes: initialData.durationMinutes,
        locationType: initialData.locationType,
        locationDetail: initialData.locationDetail,
        capacity: initialData.capacity,
        price: initialData.price,
        isPaid: initialData.isPaid,
        isPublic: initialData.isPublic,
        thumbnailUrl: initialData.thumbnailUrl ?? '',
        tags: initialData.tags,
        resourceUrl: initialData.resourceUrl,
        resourceUrls: initialData.resourceUrls,
      });
    }
  }, [initialData]);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const addResourceUrl = () => {
    setForm(f => ({ ...f, resourceUrls: [...f.resourceUrls, { title: '', url: '', type: 'link' }] }));
  };

  const updateResourceUrl = (idx: number, field: keyof ResourceLink, value: string) => {
    setForm(f => {
      const updated = [...f.resourceUrls];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...f, resourceUrls: updated };
    });
  };

  const removeResourceUrl = (idx: number) => {
    setForm(f => ({ ...f, resourceUrls: f.resourceUrls.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('제목을 입력해 주세요'); return; }
    if (!session) { setError('로그인이 필요합니다'); return; }

    setSaving(true);
    setError('');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      content: form.content,
      scheduleAt: form.scheduleAt ? new Date(form.scheduleAt).toISOString() : null,
      durationMinutes: form.durationMinutes,
      locationType: form.locationType,
      locationDetail: form.locationDetail,
      capacity: form.capacity,
      price: form.isPaid ? form.price : 0,
      isPaid: form.isPaid,
      isPublic: form.isPublic,
      thumbnailUrl: form.thumbnailUrl || undefined,
      tags: form.tags,
      resourceUrl: form.resourceUrl,
      resourceUrls: form.resourceUrls.filter(r => r.url.trim()),
    };

    try {
      const url = mode === 'new' ? '/api/classes' : `/api/classes/${initialData!.id}`;
      const method = mode === 'new' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '저장 실패'); return; }
      router.push(`/classes/${data.course.id}`);
    } catch { setError('네트워크 오류가 발생했습니다'); }
    finally { setSaving(false); }
  };

  if (loading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 font-bold">로딩 중...</p></div>;
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      <div className="sticky top-16 md:top-20 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Link href="/classes" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <FaArrowLeft className="text-sm text-gray-600 dark:text-gray-400" />
          </Link>
          <span className="text-sm font-black text-gray-900 dark:text-white">{mode === 'new' ? '새 클래스 등록' : '클래스 수정'}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="container mx-auto max-w-3xl px-4 py-10 space-y-8">
        {/* 기본 정보 */}
        <section className="space-y-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">기본 정보</h2>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">제목 *</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="클래스 제목" required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">한줄 설명</label>
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)} placeholder="짧은 소개 문구" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">상세 내용 (Markdown)</label>
            <textarea value={form.content} onChange={e => set('content', e.target.value)} rows={8} placeholder="## 수업 목표&#10;&#10;## 커리큘럼&#10;&#10;## 준비물" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-mono text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y" />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">태그</label>
            <TagInput value={form.tags} onChange={tags => set('tags', tags)} placeholder="AI, 챗봇, 자동화" accentColor="blue" />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">썸네일 URL</label>
            <input type="url" value={form.thumbnailUrl} onChange={e => set('thumbnailUrl', e.target.value)} placeholder="https://..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>
        </section>

        {/* 일정 정보 */}
        <section className="space-y-5 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">일정 & 장소</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">수업 일시</label>
              <input type="datetime-local" value={form.scheduleAt} onChange={e => set('scheduleAt', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">소요 시간 (분)</label>
              <input type="number" value={form.durationMinutes} onChange={e => set('durationMinutes', parseInt(e.target.value) || 60)} min={10} max={720} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">진행 방식</label>
            <div className="flex gap-2">
              {(['online', 'offline', 'hybrid'] as LocationType[]).map(type => (
                <button key={type} type="button" onClick={() => set('locationType', type)} className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${form.locationType === type ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700'}`}>
                  {type === 'online' ? '🖥️ 온라인' : type === 'offline' ? '🏫 오프라인' : '🔀 혼합'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">장소/링크 (비공개)</label>
            <input type="text" value={form.locationDetail} onChange={e => set('locationDetail', e.target.value)} placeholder="오프라인: 주소 | 온라인: Zoom 링크 등" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">정원 (0 = 무제한)</label>
            <input type="number" value={form.capacity} onChange={e => set('capacity', parseInt(e.target.value) || 0)} min={0} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>
        </section>

        {/* 가격 설정 */}
        <section className="space-y-4 p-5 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10">
          <h2 className="text-xs font-black uppercase tracking-widest text-amber-500">💰 가격 설정</h2>
          <div className="flex gap-3">
            <button type="button" onClick={() => { set('isPaid', false); set('price', 0); }} className={`flex-1 py-3 rounded-xl text-sm font-black border-2 transition-all ${!form.isPaid ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700'}`}>🆓 무료</button>
            <button type="button" onClick={() => set('isPaid', true)} className={`flex-1 py-3 rounded-xl text-sm font-black border-2 transition-all ${form.isPaid ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700'}`}>💎 유료</button>
          </div>
          {form.isPaid && (
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-amber-500 mb-2">수강료 (원)</label>
              <input type="number" value={form.price} onChange={e => set('price', parseInt(e.target.value) || 0)} min={0} step={1000} className="w-full px-4 py-3 rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
            </div>
          )}
        </section>

        {/* 수업 자료 */}
        <section className="space-y-4 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">수업 자료 (교실 페이지)</h2>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">메인 자료 URL</label>
            <input type="url" value={form.resourceUrl} onChange={e => set('resourceUrl', e.target.value)} placeholder="https://notion.so/..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500">추가 자료</label>
              <button type="button" onClick={addResourceUrl} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-xs font-bold">
                <FaPlus className="text-[10px]" /> 추가
              </button>
            </div>
            <div className="space-y-3">
              {form.resourceUrls.map((r, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <select value={r.type ?? 'link'} onChange={e => updateResourceUrl(idx, 'type', e.target.value)} className="px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-violet-500">
                    <option value="link">🔗 링크</option>
                    <option value="video">🎥 동영상</option>
                    <option value="doc">📄 문서</option>
                    <option value="pdf">📑 PDF</option>
                  </select>
                  <input type="text" value={r.title} onChange={e => updateResourceUrl(idx, 'title', e.target.value)} placeholder="제목" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-violet-500" />
                  <input type="url" value={r.url} onChange={e => updateResourceUrl(idx, 'url', e.target.value)} placeholder="URL" className="flex-[2] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-violet-500" />
                  <button type="button" onClick={() => removeResourceUrl(idx)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <FaTrash className="text-xs" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 공개 설정 */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => set('isPublic', !form.isPublic)} className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${form.isPublic ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
            <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{form.isPublic ? '공개' : '비공개'}</span>
        </div>

        {error && <p className="text-sm text-red-500 font-bold">{error}</p>}

        <div className="flex gap-3 pt-4">
          <Link href="/classes" className="flex-1 text-center py-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400">취소</Link>
          <button type="submit" disabled={saving} className="flex-[2] py-4 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black shadow-lg shadow-violet-200 dark:shadow-violet-900/30 transition-all">
            {saving ? '저장 중...' : mode === 'new' ? '클래스 등록' : '수정 저장'}
          </button>
        </div>
      </form>
    </main>
  );
}
