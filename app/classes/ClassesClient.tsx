'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Course } from '@/types/database';
import ClassCard from '@/components/ClassCard';
import { FaPlus, FaGraduationCap } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';

interface ClassesClientProps {
  initialCourses: Course[];
}

type PricingFilter = 'all' | 'free' | 'paid';
type TypeFilter = 'all' | 'online' | 'offline' | 'hybrid';

export default function ClassesClient({ initialCourses }: ClassesClientProps) {
  const { isAdmin } = useAuth();
  const [pricing, setPricing] = useState<PricingFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const filtered = useMemo(() => {
    let result = initialCourses;
    if (pricing === 'free') result = result.filter(c => !c.isPaid || c.price === 0);
    if (pricing === 'paid') result = result.filter(c => c.isPaid && c.price > 0);
    if (typeFilter !== 'all') result = result.filter(c => c.courseType === typeFilter);
    return result;
  }, [initialCourses, pricing, typeFilter]);

  const counts = useMemo(() => ({
    all: initialCourses.length,
    free: initialCourses.filter(c => !c.isPaid || c.price === 0).length,
    paid: initialCourses.filter(c => c.isPaid && c.price > 0).length,
    online: initialCourses.filter(c => c.courseType === 'online').length,
    offline: initialCourses.filter(c => c.courseType === 'offline').length,
    hybrid: initialCourses.filter(c => c.courseType === 'hybrid').length,
  }), [initialCourses]);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero */}
      <section className="relative pt-20 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50/30 to-fuchsia-50 dark:from-violet-950/20 dark:via-purple-950/10 dark:to-fuchsia-950/20" />
        <div className="relative container mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 mb-6">
              <FaGraduationCap className="text-violet-600 dark:text-violet-400 text-sm" />
              <span className="text-[11px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-300">CLASSES</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900 dark:text-white mb-4">AI 클래스</h1>
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
              바이브코딩 AI 실전 클래스에 참여하세요.<br />
              온라인·오프라인 수업으로 AI를 빠르게 익힙니다.
            </p>
          </div>
          {isAdmin && (
            <Link href="/classes/new" className="absolute top-0 right-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-lg transition-all">
              <FaPlus className="text-xs" /> 클래스 추가
            </Link>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 md:top-20 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="container mx-auto max-w-6xl px-4 py-3 flex flex-wrap gap-2">
          {([['all', '🔍 전체', counts.all], ['free', '🆓 무료', counts.free], ['paid', '💎 유료', counts.paid]] as [PricingFilter, string, number][]).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setPricing(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                pricing === key
                  ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500 hover:border-violet-300'
              }`}
            >
              {label}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${pricing === key ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{count}</span>
            </button>
          ))}
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 self-center mx-1" />
          {([['all', '전체'], ['online', '🖥️ 온라인'], ['offline', '🏫 오프라인'], ['hybrid', '🔀 혼합']] as [TypeFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                typeFilter === key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="container mx-auto max-w-6xl px-4 py-12">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FaGraduationCap className="text-6xl text-gray-200 dark:text-gray-800 mb-4" />
            <p className="text-lg font-bold text-gray-400">
              {initialCourses.length === 0 ? '아직 등록된 클래스가 없습니다' : '해당 조건의 클래스가 없습니다'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(course => (
              <ClassCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
