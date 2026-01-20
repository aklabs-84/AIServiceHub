import Link from 'next/link';
import Image from 'next/image';
import { FaFeatherAlt, FaPlus, FaRocket, FaShieldAlt, FaListUl, FaLock } from 'react-icons/fa';
import Footer from '@/components/Footer';
import HeroPreview from '@/components/HeroPreview';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        {/* 히어로 */}
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] xl:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-12 items-center">
          <div className="space-y-6 w-full lg:pr-6">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-semibold">
              <FaRocket />
              <span>AI LABS</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-bold text-gray-900 dark:text-gray-50 leading-tight">
              AI LABS에서
              <br />
              아이디어를 실험하고
              <br />
              공유하세요
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
              바이브코딩으로 만든 AI 앱과 프롬프트를 실험하고 기록하는 랩입니다.
              <br />
              실행 링크와 본문을 안전하게 모아두고 팀과 빠르게 검증해 보세요.
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
            <div className="absolute -inset-8 bg-gradient-to-tr from-emerald-200 via-cyan-200 to-blue-200 dark:from-emerald-900/40 dark:via-cyan-900/30 dark:to-blue-900/30 blur-3xl opacity-70" />
            <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/40 dark:ring-gray-800/60 bg-transparent backdrop-blur-sm">
              <HeroPreview />
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
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50 leading-snug">
                내가 만든 앱·프롬프트, 혼자 쓰지 말고 공유해서 키우세요
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                만든 걸 올려 팀/커뮤니티와 아이디어를 주고받고,
                <span className="block">다른 사람들의 작업을 보며 영감을 얻으세요.</span>
                <span className="block">저장(🔒), 공유(🔗), 피드백(💬)까지 한 자리에서 끝납니다.</span>
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
                <span>🚀 발견 · 영감</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-2">다른 사람 작업 보며 아이디어 얻기</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">필터·좋아요로 흩어진 앱/프롬프트를 모으고, 잘 만든 사례에서 바로 영감을 얻으세요.</p>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                <FaPlus className="text-emerald-500" />
                <span>💾 공유 · 실행</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-2">내가 만든 것 올리고 함께 써보기</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">URL·썸네일·SNS까지 올려두면 팀원이 바로 실행·활용할 수 있는 공유 라이브러리가 됩니다.</p>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                <FaLock className="text-purple-500" />
                <span>🔒 피드백 · 개선</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-2">로그인한 팀만 보기, 댓글로 더 나은 버전</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">보안을 유지한 채 피드백을 받고, 프롬프트·앱을 반복 개선해 더 나은 결과물을 만들어보세요.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 뉴스레터 섹션 */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-10 md:mt-12">
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
                <Image
                  src="/newsletter.png"
                  alt="뉴스레터 일러스트"
                  width={360}
                  height={240}
                  className="relative max-h-56 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 설문 참여 섹션 */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-8 md:mt-10">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-10 shadow-xl">
          <div className="absolute -inset-12 bg-gradient-to-br from-purple-100 via-emerald-50 to-cyan-50 dark:from-purple-900/10 dark:via-emerald-900/10 dark:to-cyan-900/10 blur-3xl opacity-70 pointer-events-none" />
          <div className="relative grid md:grid-cols-2 items-center gap-6 md:gap-8">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-purple-600 dark:text-purple-300">AI 활용 설문</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50 leading-tight">
                AI로 풀고 싶은 문제와 목표를 알려주세요
              </h3>
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                어떤 일을 자동화하거나 개선하고 싶은지, AI를 활용해 해결하고 싶은 문제는 무엇인지 간단히 적어주세요.
                <span className="block mt-1">답변을 모아 더 맞춤화된 콘텐츠와 기능을 준비할게요.</span>
              </p>
              <Link
                href="https://codepen.io/moruma/full/emJzvev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-max items-center space-x-2 px-5 py-3 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 border border-gray-900 dark:border-white font-semibold shadow-sm hover:-translate-y-0.5 transition-all"
              >
                <span>설문 작성하러 가기</span>
              </Link>
            </div>
            <div className="flex justify-center md:justify-center">
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-white/40 dark:border-gray-700/60">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-200/60 via-emerald-200/50 to-cyan-200/60 dark:from-purple-800/40 dark:via-emerald-800/30 dark:to-cyan-800/40" />
                <Image
                  src="/survey.png"
                  alt="설문 일러스트"
                  width={360}
                  height={240}
                  className="relative max-h-56 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 인공지능 교육 신청 섹션 */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-8 md:mt-10">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 dark:from-indigo-900/20 dark:via-sky-900/20 dark:to-emerald-900/20 p-6 sm:p-10 shadow-lg">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">인공지능 교육 신청</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">팀 맞춤 AI 교육을 신청해 보세요</h3>
              <p className="text-gray-700 dark:text-gray-300">
                실무에 바로 쓸 수 있는 AI 도구 활용법부터 워크플로우 자동화, 프롬프트 작성법까지
                <span className="block mt-1">팀 목표에 맞춘 교육 커리큘럼을 준비해 드립니다.</span>
              </p>
              <div className="pt-2">
                <Link
                  href="https://tally.so/r/yPMJRX"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 border border-gray-900 dark:border-white font-semibold shadow-sm hover:-translate-y-0.5 transition-all"
                >
                  교육 신청하기
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-white/40 dark:border-gray-700/60">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/60 via-sky-200/50 to-emerald-200/60 dark:from-indigo-800/40 dark:via-sky-800/30 dark:to-emerald-800/40" />
                <Image
                  src="/study.png"
                  alt="인공지능 교육 일러스트"
                  width={360}
                  height={240}
                  className="relative max-h-56 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 제작 의뢰 섹션 */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-8 md:mt-10">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-50 via-fuchsia-50 to-amber-50 dark:from-purple-900/20 dark:via-fuchsia-900/20 dark:to-amber-900/20 p-6 sm:p-10 shadow-lg">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">바이브 코딩 제작 의뢰</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">머릿속 한 줄을 바로 작동하는 서비스로</h3>
              <p className="text-gray-700 dark:text-gray-300">
                아이디어를 빠르게 정리하고, 1~7일 안에 돌아가는 MVP로 제작해 드립니다.
                <span className="block mt-1">프로토타입부터 배포까지 한 번에 맡겨보세요.</span>
              </p>
              <div className="pt-2">
                <Link
                  href="/request"
                  className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 border border-gray-900 dark:border-white font-semibold shadow-sm hover:-translate-y-0.5 transition-all"
                >
                  제작 의뢰하기
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-white/40 dark:border-gray-700/60">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-200/60 via-fuchsia-200/50 to-amber-200/60 dark:from-purple-800/40 dark:via-fuchsia-800/30 dark:to-amber-800/40" />
                <Image
                  src="/request.svg"
                  alt="제작 의뢰 일러스트"
                  width={360}
                  height={240}
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
