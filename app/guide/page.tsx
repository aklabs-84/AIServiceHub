'use client';

import Link from 'next/link';
import { FaFeatherAlt, FaHome, FaListAlt, FaLock, FaQuestionCircle, FaRocket, FaUserPlus } from 'react-icons/fa';

const faqs = [
  {
    q: '이 웹앱으로 무엇을 할 수 있나요?',
    a: 'AI 앱과 프롬프트를 등록·보관하고, 카드/리스트 뷰로 탐색하며, 로그인한 사용자만 프롬프트 본문과 링크를 볼 수 있게 보호할 수 있습니다.',
  },
  {
    q: '앱과 프롬프트를 어떻게 등록하나요?',
    a: '우측 상단 프로필 메뉴에서 로그인한 뒤, 상단 메뉴의 앱/프롬프트 페이지에서 “등록” 버튼을 눌러 제목, 설명, URL, 썸네일, SNS 링크를 입력하면 됩니다.',
  },
  {
    q: '프롬프트 본문은 누가 볼 수 있나요?',
    a: '로그인한 사용자만 열람할 수 있도록 규칙으로 보호됩니다. SNS 링크도 함께 보이므로 외부 소개를 안전하게 공유할 수 있습니다.',
  },
  {
    q: '카드형과 리스트형은 어디서 바꾸나요?',
    a: '앱/프롬프트 목록과 마이페이지의 내 앱·내 프롬프트·좋아요 탭에 카드/리스트 토글이 있습니다. 원하는 레이아웃으로 전환해 보세요.',
  },
  {
    q: '댓글은 어떻게 동작하나요?',
    a: '로그인한 사용자는 앱·프롬프트 상세에서 댓글을 남길 수 있으며, 작성자는 자신의 댓글을 수정/삭제할 수 있습니다.',
  },
  {
    q: '데이터는 어떻게 분류하나요?',
    a: '앱은 카테고리, 좋아요 수, 썸네일과 함께 저장되고, 프롬프트는 카테고리·본문·SNS 링크로 저장됩니다. 마이페이지에서 내가 만든 것과 좋아요한 것을 한 번에 볼 수 있습니다.',
  },
];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-gray-800 dark:hover:text-gray-200">
            <FaHome /> 홈
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span>Q&A</span>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                <FaQuestionCircle className="text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">시작 가이드 · FAQ</p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">이 웹앱을 사용하는 방법</h1>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">STEP 1</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">로그인</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Google 로그인 후 프로필 메뉴에서 마이페이지 접근.</p>
              </div>
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">STEP 2</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">등록</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">앱/프롬프트 페이지에서 새 항목 등록, SNS 링크까지 함께 저장.</p>
              </div>
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">STEP 3</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">공유 & 피드백</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">카드/리스트로 공유하고 댓글로 피드백을 주고받습니다.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/apps" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 border border-gray-900 dark:border-white font-semibold shadow-sm hover:-translate-y-0.5 transition">
                <FaRocket /> 앱 둘러보기
              </Link>
              <Link href="/prompts" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <FaFeatherAlt /> 프롬프트 보기
              </Link>
              <Link href="/my" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <FaListAlt /> 마이페이지
              </Link>
            </div>
          </div>

          <div className="mt-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <FaQuestionCircle className="text-emerald-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">자주 묻는 질문</h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {faqs.map((item, idx) => (
                <div key={idx} className="py-4">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">{item.q}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-4">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  <FaUserPlus /> 회원 전용 정보
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">프롬프트 본문과 링크는 로그인한 사용자만 볼 수 있어요. 팀 공유 시에도 안전하게 관리됩니다.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  <FaLock /> 카드/리스트 전환
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">목록 상단 토글로 보기 방식을 바꿔서 팀 상황에 맞게 빠르게 스캔할 수 있습니다.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
