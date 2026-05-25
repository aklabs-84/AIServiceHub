'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Course } from '@/types/database';
import { FaLock, FaUsers, FaCalendarAlt, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { HiAcademicCap } from 'react-icons/hi';

interface ClassCardProps {
  course: Course;
}

function formatSchedule(date: Date | null): string {
  if (!date) return '일정 미정';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    weekday: 'short',
  }).format(date);
}

function locationLabel(type: string) {
  if (type === 'online') return { emoji: '🖥️', text: '온라인' };
  if (type === 'offline') return { emoji: '🏫', text: '오프라인' };
  return { emoji: '🔀', text: '혼합' };
}

export default function ClassCard({ course }: ClassCardProps) {
  const isPaid = course.isPaid && course.price > 0;
  const loc = locationLabel(course.locationType);
  const isUpcoming = course.scheduleAt ? course.scheduleAt > new Date() : true;

  return (
    <Link
      href={`/classes/${course.id}`}
      className="group flex flex-col bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 transition-all duration-500 hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1"
    >
      {/* 썸네일 */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <HiAcademicCap className="text-white/20 text-9xl absolute -right-4 -bottom-4 rotate-12" />
            <HiAcademicCap className="relative z-10 text-7xl text-white drop-shadow-2xl transition-transform duration-500 group-hover:scale-110" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* 유료 배지 */}
        {isPaid && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm">
            <FaLock className="text-white text-[9px]" />
            <span className="text-white text-[11px] font-black">{course.price.toLocaleString()}원</span>
          </div>
        )}

        {/* 방식 배지 */}
        <div className="absolute top-3 left-3 z-20">
          <div className="px-2.5 py-1 rounded-xl backdrop-blur-md bg-white/90 dark:bg-gray-950/80 border border-white/20 shadow-sm">
            <span className="text-[10px] font-black">{loc.emoji} {loc.text}</span>
          </div>
        </div>

        {/* 상태 배지 */}
        {!isUpcoming && (
          <div className="absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-full bg-gray-900/70 backdrop-blur-sm">
            <span className="text-white text-[10px] font-black">종료됨</span>
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-base font-black tracking-tight text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
          {course.title}
        </h3>

        {course.description && (
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
            {course.description}
          </p>
        )}

        {/* 태그 */}
        {course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {course.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/50">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto space-y-2 pt-3 border-t border-gray-50 dark:border-gray-800">
          {/* 일시 */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <FaCalendarAlt className="text-violet-500 text-[10px] flex-none" />
            <span className="font-medium">{formatSchedule(course.scheduleAt)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <FaClock className="text-[10px]" />
                <span className="font-medium">{course.durationMinutes}분</span>
              </div>
              {course.capacity > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <FaUsers className="text-[10px]" />
                  <span className="font-medium">{course.enrollmentCount}/{course.capacity}명</span>
                </div>
              )}
            </div>

            {isPaid ? (
              <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                <FaLock className="text-[8px]" /> {course.price.toLocaleString()}원
              </span>
            ) : (
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                🆓 무료
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
