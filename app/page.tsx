import Link from 'next/link';
import Image from 'next/image';
import { FaFeatherAlt, FaPlus, FaRocket, FaListUl, FaLock, FaMobileAlt, FaMousePointer, FaDownload } from 'react-icons/fa';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 font-sans selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900/40">
      {/* 배경 장식 요소 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/40 dark:bg-blue-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-100/40 dark:bg-emerald-900/10 blur-[120px] rounded-full" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* === 히어로 섹션 === */}
        <div className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* 텍스트 영역 */}
            <div className="relative z-20 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs sm:text-sm font-bold tracking-tight border border-blue-100 dark:border-blue-800">
                <FaRocket className="animate-pulse" />
                <span>AI LABS - EXPLORE THE FUTURE</span>
              </div>

              <div className="space-y-6">
                <h1 className="font-black tracking-tighter text-gray-900 dark:text-white leading-[1.1]">
                  <span className="block text-3xl sm:text-4xl xl:text-5xl mb-2 opacity-80">AI LABS에서</span>
                  <span className="block text-5xl sm:text-6xl xl:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300 leading-tight">
                    아이디어를
                  </span>
                  <span className="block text-6xl sm:text-8xl xl:text-9xl bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-emerald-500 dark:from-cyan-300 dark:to-emerald-400 leading-none">
                    실현하세요
                  </span>
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                  바이브코딩으로 만든 AI 앱과 프롬프트를 보관하고 실험하는 공간입니다.
                  당신의 창의력을 팀과 공유하고 함께 성장시키세요.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/apps"
                  className="group w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gray-200 dark:shadow-none"
                >
                  <FaRocket className="mr-2" />
                  <span>앱 둘러보기</span>
                </Link>
                <Link
                  href="/prompts"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-800 font-bold text-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm"
                >
                  <FaFeatherAlt className="mr-2" />
                  <span>프롬프트 아카이브</span>
                </Link>
              </div>

              {/* 통계/신뢰 요소 (필요시) */}
              <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-sm text-gray-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>100+ AI Tools</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Active Community</span>
                </div>
              </div>
            </div>

            {/* 이미지 영역 */}
            <div className="relative z-10 lg:pl-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-blue-400/20 via-cyan-400/10 to-emerald-400/20 blur-[80px] -z-10 rounded-full opacity-60 pointer-events-none" />
              <div className="relative flex justify-center items-center drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:drop-shadow-none">
                {/* 라이트 모드용 이미지 */}
                <Image
                  src="/hero-partner-robot-light.png"
                  alt="AI Collaboration Partner"
                  width={1024}
                  height={1024}
                  priority
                  className="w-full h-auto max-w-[320px] sm:max-w-[480px] lg:max-w-[650px] object-contain transform hover:rotate-2 transition-transform duration-700 select-none pointer-events-none mix-blend-multiply dark:hidden contrast-[1.05] brightness-[1.05]"
                  style={{
                    maskImage: 'radial-gradient(circle at center, black 60%, transparent 95%)',
                    WebkitMaskImage: 'radial-gradient(circle at center, black 60%, transparent 95%)'
                  }}
                />
                {/* 다크 모드용 이미지 */}
                <Image
                  src="/hero-partner-robot-dark.png"
                  alt="AI Collaboration Partner"
                  width={1024}
                  height={1024}
                  priority
                  className="hidden dark:block w-full h-auto max-w-[320px] sm:max-w-[480px] lg:max-w-[650px] object-contain transform hover:rotate-2 transition-transform duration-700 select-none pointer-events-none mix-blend-screen contrast-[1.1] brightness-[0.9]"
                  style={{
                    maskImage: 'radial-gradient(circle at center, black 60%, transparent 95%)',
                    WebkitMaskImage: 'radial-gradient(circle at center, black 60%, transparent 95%)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* === 핵심 기능/소개 섹션 === */}
        <div className="py-20 md:py-28 relative">
          <div className="text-center space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-300 uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">
              How to reach perfection
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              아이디어가 결과물이 되는 과정
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <FeatureCard
              icon={<FaListUl className="text-blue-500" />}
              title="발견과 영감"
              description="다른 사람들이 만든 앱과 프롬프트를 살펴보며 당신만의 영감을 얻으세요."
              bgColor="bg-blue-50/50 dark:bg-blue-900/10"
              borderColor="border-blue-100/50 dark:border-blue-800/50"
            />
            <FeatureCard
              icon={<FaPlus className="text-emerald-500" />}
              title="공유와 실행"
              description="당신의 작업을 URL 하나로 팀원들에게 공유하고 브라우저에서 바로 실행하세요."
              bgColor="bg-emerald-50/50 dark:bg-emerald-900/10"
              borderColor="border-emerald-100/50 dark:border-emerald-800/50"
            />
            <FeatureCard
              icon={<FaLock className="text-purple-500" />}
              title="피드백과 개선"
              description="댓글로 의견을 나누고 반복적인 개선을 통해 더 나은 AI 서비스를 만드세요."
              bgColor="bg-purple-50/50 dark:bg-purple-900/10"
              borderColor="border-purple-100/50 dark:border-purple-800/50"
            />
          </div>
        </div>

        {/* === 앱 사용 가이드 섹션 === */}
        <div className="py-20 md:py-24 relative">
          <div className="text-center space-y-4 mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
              How to use
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              앱 사용, 이렇게 시작하세요
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
              클릭 한 번으로 AI 앱을 실행하고, 홈 화면에 추가해 언제든 바로 사용하세요.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <InstallStepCard
              step="01"
              icon={<FaListUl />}
              title="앱 탐색"
              description="앱스토어에서 원하는 AI 앱을 찾아보세요. 카테고리, 태그, 검색으로 빠르게 찾을 수 있어요."
              color="blue"
            />
            <InstallStepCard
              step="02"
              icon={<FaMousePointer />}
              title="바로 실행"
              description="앱 카드를 클릭한 뒤 '열기' 버튼을 누르면 AI 앱이 브라우저에서 즉시 실행됩니다."
              color="indigo"
            />
            <InstallStepCard
              step="03"
              icon={<FaMobileAlt />}
              title="홈 화면에 설치"
              description="'홈화면 추가' 또는 '앱 설치' 버튼으로 아이콘을 바탕화면에 추가하면 앱처럼 빠르게 접근할 수 있어요."
              color="purple"
            />
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/apps"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gray-200 dark:shadow-none"
            >
              <FaRocket className="text-sm" />
              앱 둘러보기
            </Link>
          </div>
        </div>

        {/* === CTA 섹션들 (Grid Layout) === */}
        <div className="py-20 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">

          {/* 뉴스레터 */}
          <CTACard
            title="AI 트렌드를 놓치지 마세요"
            description="바이브코딩의 최신 AI 활용 팁과 새로운 업데이트 소식을 가장 빠르게 전달해 드립니다."
            link="https://tally.so/r/mepkae"
            btnText="뉴스레터 신청하기"
            imgSrc="/newsletter.png"
            theme="emerald"
          />

          {/* AI 교육 */}
          <CTACard
            title="팀 맞춤 AI 교육 신청"
            description="실무에 바로 적용 가능한 AI 도구 활용법부터 프롬프트 디자인까지 커리큘럼을 준비해 드립니다."
            link="https://tally.so/r/yPMJRX"
            btnText="교육 신청하기"
            imgSrc="/study.png"
            theme="indigo"
          />

          {/* 설문 참여 */}
          <CTACard
            title="당신의 목소리를 들려주세요"
            description="AI로 해결하고 싶은 문제나 목표를 알려주시면 더 좋은 기능으로 보답하겠습니다."
            link="https://codepen.io/moruma/full/emJzvev"
            btnText="설문 참여하기"
            imgSrc="/survey.png"
            theme="purple"
          />

          {/* 제작 의뢰 */}
          <CTACard
            title="아이디어를 실전 서비스로"
            description="머릿속에만 있던 프로젝트를 단 7일 안에 돌아가는 MVP로 제작해 드립니다."
            link="/request"
            btnText="제작 의뢰하기"
            imgSrc="/request.svg"
            theme="amber"
          />

        </div>
      </div>
      <Footer />
    </div>
  );
}

// === 서브 컴포넌트 ===

function FeatureCard({ icon, title, description, bgColor, borderColor }: any) {
  return (
    <div className={`group p-8 rounded-[2rem] border ${borderColor} ${bgColor} backdrop-blur-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500`}>
      <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white dark:bg-gray-800 shadow-sm mb-6 group-hover:scale-110 transition-transform">
        <div className="text-2xl">{icon}</div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
        {description}
      </p>
    </div>
  )
}

function InstallStepCard({ step, icon, title, description, color }: any) {
  const colors: any = {
    blue: {
      bg: 'bg-blue-50/60 dark:bg-blue-900/10',
      border: 'border-blue-100/60 dark:border-blue-800/50',
      badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300',
      icon: 'text-blue-500',
    },
    indigo: {
      bg: 'bg-indigo-50/60 dark:bg-indigo-900/10',
      border: 'border-indigo-100/60 dark:border-indigo-800/50',
      badge: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300',
      icon: 'text-indigo-500',
    },
    purple: {
      bg: 'bg-purple-50/60 dark:bg-purple-900/10',
      border: 'border-purple-100/60 dark:border-purple-800/50',
      badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300',
      icon: 'text-purple-500',
    },
  }
  const c = colors[color]
  return (
    <div className={`group p-8 rounded-[2rem] border ${c.border} ${c.bg} backdrop-blur-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500`}>
      <div className="flex items-center gap-3 mb-6">
        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${c.badge}`}>{step}</span>
        <div className={`text-xl ${c.icon} group-hover:scale-110 transition-transform`}>{icon}</div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{description}</p>
    </div>
  )
}

function CTACard({ title, description, link, btnText, imgSrc, theme }: any) {
  const themes: any = {
    emerald: "from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-100 dark:border-emerald-800 hover:shadow-emerald-200/50",
    indigo: "from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-indigo-100 dark:border-indigo-800 hover:shadow-indigo-200/50",
    purple: "from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20 border-purple-100 dark:border-purple-800 hover:shadow-purple-200/50",
    amber: "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-100 dark:border-amber-800 hover:shadow-amber-200/50",
  }

  return (
    <div className={`relative overflow-hidden p-8 sm:p-10 rounded-[2.5rem] border bg-gradient-to-br ${themes[theme]} hover:shadow-xl transition-all duration-500 flex flex-col justify-between items-start`}>
      <div className="space-y-4 relative z-10 w-full mb-8">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-snug">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed max-w-[85%]">
          {description}
        </p>
        <div className="pt-2">
          <Link
            href={link}
            target={link.startsWith('http') ? "_blank" : "_self"}
            className="inline-flex items-center px-6 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold hover:scale-105 active:scale-95 transition-all"
          >
            {btnText}
          </Link>
        </div>
      </div>

      <div className="absolute right-[-10%] bottom-[-5%] w-[45%] h-auto opacity-40 group-hover:opacity-100 transition-opacity">
        <Image
          src={imgSrc}
          alt={title}
          width={400}
          height={300}
          className="object-contain max-h-48 drop-shadow-xl"
        />
      </div>
    </div>
  )
}
