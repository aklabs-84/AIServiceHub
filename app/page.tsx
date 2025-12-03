'use client';

import Link from 'next/link';
import { FaFeatherAlt, FaPlus, FaRocket, FaShieldAlt } from 'react-icons/fa';
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
        <div className="mt-16 md:mt-24 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">이 앱에서 할 수 있는 것</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50 mt-1">AI 앱과 프롬프트를 한 번에 관리</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                앱은 누구나 볼 수 있고, 프롬프트 본문과 SNS 링크는 로그인한 가입자만 볼 수 있도록 보호했습니다.
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
            <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">AI 앱</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-2">바이브코딩 스튜디오</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">카테고리 필터, 좋아요, 썸네일까지 포함한 AI 서비스 갤러리.</p>
            </div>
            <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">프롬프트</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-2">프롬프트 아카이브</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">본문과 SNS 링크를 함께 저장해, 바로 실행하거나 더 알아볼 수 있습니다.</p>
            </div>
            <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">보안 & 협업</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-2">로그인 보호 + 공유</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">프롬프트 내용은 가입자만 열람, 앱/프롬프트 등록과 좋아요로 협업.</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
