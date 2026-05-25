'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Course, CourseMaterial, CourseType } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import TagInput from '@/components/TagInput';
import MarkdownEditor from '@/components/MarkdownEditor';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import Link from 'next/link';

interface Props {
  mode: 'new' | 'edit';
  initialData?: Course;
}

interface FormData {
  title: string;
  description: string;
  thumbnailUrl: string;
  courseType: CourseType;
  startAt: string;
  endAt: string;
  location: string;
  materials: CourseMaterial[];
  materialUrl: string;
  tags: string[];
  maxParticipants: string; // 빈 문자열 = 무제한
  price: number;
  isPaid: boolean;
  isPublished: boolean;
}

const DEFAULT_FORM: FormData = {
  title: '',
  description: '',
  thumbnailUrl: '',
  courseType: 'online',
  startAt: '',
  endAt: '',
  location: '',
  materials: [],
  materialUrl: '',
  tags: [],
  maxParticipants: '',
  price: 0,
  isPaid: false,
  isPublished: false,
};

function toDatetimeLocal(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function CourseFormPage({ mode, initialData }: Props) {
  const router = useRouter();
  const { user, session, isAdmin, loading } = useAuth();
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const formInitialized = useRef(false);

  // 관리자 아니면 리다이렉트
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/classes');
  }, [loading, user, isAdmin, router]);

  // 수정 모드: 초기값 세팅 (최초 1회만 — initialData 참조 변경 시 재초기화 방지)
  useEffect(() => {
    if (initialData && !formInitialized.current) {
      formInitialized.current = true;
      setForm({
        title: initialData.title,
        description: initialData.description,
        thumbnailUrl: initialData.thumbnailUrl ?? '',
        courseType: initialData.courseType,
        startAt: toDatetimeLocal(initialData.startAt),
        endAt: toDatetimeLocal(initialData.endAt),
        location: initialData.location,
        materials: initialData.materials,
        materialUrl: initialData.materialUrl,
        tags: initialData.tags,
        maxParticipants: initialData.maxParticipants != null ? String(initialData.maxParticipants) : '',
        price: initialData.price,
        isPaid: initialData.isPaid,
        isPublished: initialData.isPublished,
      });
    }
  }, [initialData]);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const addMaterial = () => {
    setForm(f => ({ ...f, materials: [...f.materials, { type: 'link', title: '', url: '' }] }));
  };

  const updateMaterial = (idx: number, field: keyof CourseMaterial, value: string) => {
    setForm(f => {
      const updated = [...f.materials];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...f, materials: updated };
    });
  };

  const removeMaterial = (idx: number) => {
    setForm(f => ({ ...f, materials: f.materials.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('제목을 입력해 주세요'); return; }
    if (!form.startAt) { setError('시작 일시를 입력해 주세요'); return; }
    if (!form.endAt) { setError('종료 일시를 입력해 주세요'); return; }
    if (new Date(form.startAt) >= new Date(form.endAt)) { setError('종료 일시는 시작 일시보다 나중이어야 합니다'); return; }
    if (!session) { setError('로그인이 필요합니다'); return; }

    setSaving(true);
    setError('');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      thumbnailUrl: form.thumbnailUrl || undefined,
      courseType: form.courseType,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      location: form.location,
      materials: form.materials.filter(m => m.url.trim()),
      materialUrl: form.materialUrl,
      tags: form.tags,
      maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants) : null,
      price: form.isPaid ? form.price : 0,
      isPaid: form.isPaid,
      isPublished: form.isPublished,
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
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">소개</label>
            <MarkdownEditor value={form.description} onChange={v => set('description', v)} placeholder="클래스 소개 내용..." minHeight={220} />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">태그</label>
            <TagInput value={form.tags} onChange={tags => set('tags', tags)} placeholder="AI, 챗봇, 자동화" accentColor="blue" source="classes" />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">썸네일 URL</label>
            <input type="url" value={form.thumbnailUrl} onChange={e => set('thumbnailUrl', e.target.value)} placeholder="https://..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>
        </section>

        {/* 일정 & 장소 */}
        <section className="space-y-5 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">일정 & 장소</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">시작 일시 *</label>
              <input type="datetime-local" value={form.startAt} onChange={e => set('startAt', e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">종료 일시 *</label>
              <input type="datetime-local" value={form.endAt} onChange={e => set('endAt', e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">진행 방식</label>
            <div className="flex gap-2">
              {(['online', 'offline', 'hybrid'] as CourseType[]).map(type => (
                <button key={type} type="button" onClick={() => set('courseType', type)} className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all ${form.courseType === type ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700'}`}>
                  {type === 'online' ? '🖥️ 온라인' : type === 'offline' ? '🏫 오프라인' : '🔀 혼합'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">장소 / 플랫폼</label>
            <input type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="예: Zoom, 강남구 XX빌딩 등" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">정원 (비워두면 무제한)</label>
            <input type="number" value={form.maxParticipants} onChange={e => set('maxParticipants', e.target.value)} min={1} placeholder="예: 20" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>
        </section>

        {/* 가격 */}
        <section className="space-y-4 p-5 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10">
          <h2 className="text-xs font-black uppercase tracking-widest text-amber-500">💰 가격 설정</h2>
          <div className="flex gap-3">
            <button type="button" onClick={() => { set('isPaid', false); set('price', 0); }} className={`flex-1 py-3 rounded-xl text-sm font-black border-2 transition-all ${!form.isPaid ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700'}`}>🆓 무료</button>
            <button type="button" onClick={() => set('isPaid', true)} className={`flex-1 py-3 rounded-xl text-sm font-black border-2 transition-all ${form.isPaid ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700'}`}>💎 유료</button>
          </div>
          {form.isPaid && (
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-amber-500 mb-2">수강료 (원)</label>
              <input type="number" value={form.price} onChange={e => set('price', parseInt(e.target.value) || 0)} min={0} step={1000} className="w-full px-4 py-3 rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          )}
        </section>

        {/* 수업 자료 */}
        <section className="space-y-4 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">수업 자료 (입장코드 소지자만 열람)</h2>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">메인 자료 URL</label>
            <input type="url" value={form.materialUrl} onChange={e => set('materialUrl', e.target.value)} placeholder="https://notion.so/..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500">자료 목록</label>
              <button type="button" onClick={addMaterial} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-xs font-bold">
                <FaPlus className="text-[10px]" /> 추가
              </button>
            </div>
            <div className="space-y-3">
              {form.materials.map((m, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <select value={m.type} onChange={e => updateMaterial(idx, 'type', e.target.value)} className="px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-violet-500">
                    <option value="video">🎥 동영상</option>
                    <option value="link">🔗 링크</option>
                    <option value="file">📁 파일</option>
                    <option value="embed">📺 임베드</option>
                  </select>
                  <input type="text" value={m.title} onChange={e => updateMaterial(idx, 'title', e.target.value)} placeholder="제목" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-violet-500" />
                  <input type="url" value={m.url} onChange={e => updateMaterial(idx, 'url', e.target.value)} placeholder="URL" className="flex-[2] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-violet-500" />
                  <input type="text" value={m.desc ?? ''} onChange={e => updateMaterial(idx, 'desc', e.target.value)} placeholder="설명 (선택)" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-violet-500" />
                  <button type="button" onClick={() => removeMaterial(idx)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-none">
                    <FaTrash className="text-xs" />
                  </button>
                </div>
              ))}
              {form.materials.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">자료를 추가하세요. 승인된 수강자만 볼 수 있습니다.</p>
              )}
            </div>
          </div>
        </section>

        {/* 공개 여부 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => set('isPublished', !form.isPublished)}
            className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${form.isPublished ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{form.isPublished ? '🟢 공개 (목록에 노출)' : '🔴 비공개 (목록에서 숨김)'}</span>
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
