'use client';

import Link from 'next/link';
import { FaFeatherAlt, FaPlus, FaRocket, FaShieldAlt, FaListUl, FaLock, FaUsers } from 'react-icons/fa';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        {/* 히어로 */}
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-semibold">
              <FaRocket />
              <span>AI Service Hub</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-50 leading-tight">
              아이디어를
              <br />
              서비스로 연결하는 허브
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
              바이브코딩으로 만든 AI 앱과 프롬프트를 한 곳에서 탐색하고 공유하세요.
              필요한 영감과 실행 링크를 빠르게 찾을 수 있도록 심플하게 구성했습니다.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/apps"
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 border border-gray-900 dark:border-white font-semibold hover:-translate-y-0.5 transition-all shadow-sm"
              >
                <FaRocket />
                <span>앱 둘러보기</span>
              </Link>
              <Link
                href="/prompts"
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <FaFeatherAlt />
                <span>프롬프트 아카이브</span>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-tr from-emerald-200 via-cyan-200 to-blue-200 dark:from-emerald-900/40 dark:via-cyan-900/30 dark:to-blue-900/30 blur-3xl opacity-70" />
            <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">컬렉션</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">앱 & 프롬프트</p>
                </div>
                <FaShieldAlt className="text-emerald-500 text-2xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">바이브코딩</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">AI 앱 스튜디오</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">앱 목록, 좋아요, 공유</p>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">프롬프트 아카이브</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">아이디어 보드</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">본문 + SNS 링크</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                  <p className="text-xs text-emerald-700 dark:text-emerald-200 font-semibold">가입자 전용</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">프롬프트 본문 / SNS 링크 보호</p>
                </div>
                <div className="flex-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">협업</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">앱/프롬프트 등록 & 좋아요</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">시작하기</div>
                <div className="flex gap-2">
                  <Link
                    href="/apps/new"
                    className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    <FaPlus />
                    <span>앱 등록</span>
                  </Link>
                  <Link
                    href="/prompts/new"
                    className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 border border-gray-900 dark:border-white hover:-translate-y-0.5 transition-all shadow-sm"
                  >
                    <FaFeatherAlt />
                    <span>프롬프트 등록</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* 소개 섹션 */}
        <div className="mt-20 md:mt-28 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-7 sm:p-10 shadow-xl space-y-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300">
                <FaShieldAlt className="text-emerald-500" />
                <span>이 앱을 쓰는 방법</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50 leading-snug">AI 앱·프롬프트를 저장하고 다시 꺼내 쓰기</h2>
              <p className="text-base text-gray-600 dark:text-gray-400">
                로그인하면 내 프로젝트를 등록하고, 프롬프트 본문과 SNS 링크를 안전하게 보관한 뒤 팀과 공유할 수 있습니다.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/apps"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <FaRocket />
                <span>앱 보러가기</span>
              </Link>
              <Link
                href="/prompts"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 border border-gray-900 dark:border-white font-semibold shadow-sm hover:-translate-y-0.5 transition-all"
              >
                <FaFeatherAlt />
                <span>프롬프트 보기</span>
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                <FaListUl className="text-blue-500" />
                <span>1단계 · 둘러보기</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-2">필터와 좋아요로 큐레이션</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">카테고리 필터와 카드/리스트 뷰로 빠르게 탐색하고, 마음에 드는 항목을 좋아요로 모아둡니다.</p>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                <FaPlus className="text-emerald-500" />
                <span>2단계 · 저장</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-2">앱 & 프롬프트 등록</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">앱 URL, 썸네일, SNS 링크까지 함께 저장하면 언제든 다시 실행하거나 공유할 수 있습니다.</p>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                <FaLock className="text-purple-500" />
                <span>3단계 · 공유</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-2">보안 유지 + 팀 협업</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">프롬프트 본문과 링크는 로그인한 사용자만 확인 가능. 댓글로 피드백을 주고받으며 개선합니다.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 뉴스레터 섹션 */}
      <div className="mt-10 md:mt-12">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-emerald-50 via-cyan-50 to-blue-50 dark:from-emerald-900/20 dark:via-cyan-900/20 dark:to-blue-900/20 p-6 sm:p-10 shadow-lg">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">뉴스레터</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">AI 활용 팁과 최신 소식을 받아보세요</h3>
              <p className="text-gray-700 dark:text-gray-300">
                다양한 인공지능 활용 방법과 새로운 업데이트를 가장 빠르게 받아볼 수 있는 뉴스레터입니다.
              </p>
              <div className="pt-2">
                <Link
                  href="https://tally.so/r/mepkae"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 border border-gray-900 dark:border-white font-semibold shadow-sm hover:-translate-y-0.5 transition-all"
                >
                  뉴스레터 신청하기
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-white/40 dark:border-gray-700/60">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/60 via-cyan-200/50 to-blue-200/60 dark:from-emerald-800/40 dark:via-cyan-800/30 dark:to-blue-800/40" />
                <img
                  src="/newsletter.png"
                  alt="뉴스레터 일러스트"
                  className="relative max-h-56 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
