'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Noto_Sans_KR } from 'next/font/google';
import { useState } from 'react';
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiCode,
  FiEdit3,
  FiFileText,
  FiLayers,
  FiMessageCircle,
  FiPackage,
  FiSend,
  FiZap,
} from 'react-icons/fi';

const noto = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const painPoints = [
  {
    title: '"ChatGPT로 코드 받았는데 실행이 안 돼요"',
    solution: '작동하는 완성품으로 납품합니다',
  },
  {
    title: '"외주 맡기자니 너무 비싸고..."',
    solution: '바이브 코딩으로 합리적 가격 실현',
  },
  {
    title: '"내 아이디어를 설명하기가 어려워요"',
    solution: '대화로 기획부터 함께 정리해드려요',
  },
  {
    title: '"빠르게 프로토타입이 필요해요"',
    solution: '최소 24시간 ~ 최대 1주일 납품',
  },
];

const portfolioSections = [
  {
    title: '유틸리티 & 생산성 도구',
    desc: '업무를 더 빠르고 가볍게 만드는 웹 도구',
    items: [
      '이미지/파일 변환기 (WebP, PDF 등)',
      'QR코드 생성기',
      '링크 변환/단축 도구',
      '데이터 관리 대시보드',
      '재고/출석 관리 시스템',
    ],
    examples: 'WebP 마스터, QR Studio, 에듀킷 매니저, GDrive Linker',
  },
  {
    title: '인터랙티브 게임 & 체험',
    desc: '몰입감 있는 인터랙션과 재미 요소',
    items: [
      'AI 기반 퀴즈 게임',
      'AR 보물찾기',
      '포즈 인식 게임',
      '추리/롤플레잉 게임',
    ],
    examples: '이모지 보물찾기 AI, 낙서 퀴즈, Mystery Crafter, 포즈 조종 3D 비행기',
  },
  {
    title: '콘텐츠 & 크리에이티브',
    desc: 'AI로 콘텐츠 제작을 자동화하는 도구',
    items: [
      'AI 만화/스토리보드 생성기',
      '플레이리스트/썸네일 제작 도구',
      '인터랙티브 스토리 메이커',
      '블로그/SEO 콘텐츠 자동화',
    ],
    examples: '4컷 만화 생성기, Cinematic Storyboard, AI Playlist Creator',
  },
  {
    title: '교육 & 학습',
    desc: '학습 참여를 끌어올리는 플랫폼',
    items: [
      '실시간 퀴즈 플랫폼 (카훗 스타일)',
      '프롬프트 작성 실습 도구',
      'AI 진단/테스트',
      '진로 상담 챗봇',
    ],
    examples: 'Smart Class Quiz, 프롬프트 빌더 실습, 진로 상담 챗봇',
  },
  {
    title: 'AI 챗봇 & 자동화',
    desc: '반복 업무를 자동화하는 AI 에이전트',
    items: [
      '맞춤형 GPT/Gemini 챗봇',
      '구글 스프레드시트 연동 웹앱',
      '업무 자동화 도구',
    ],
    examples: 'Google Sheet Web-App Master, AI Studio Instruction Builder',
  },
];

const pricingPlans = [
  {
    title: '라이트',
    badge: '☁️',
    price: '15만원~',
    timeline: '1~2일',
    scope: '단일 기능',
    examples: '파일 변환기, QR 생성기',
    revisions: '1회',
    deploy: '배포 포함',
  },
  {
    title: '스탠다드',
    badge: '⚡',
    price: '35만원~',
    timeline: '3~5일',
    scope: '다중 기능',
    examples: '퀴즈 게임, 챗봇',
    revisions: '2회',
    deploy: '배포 포함',
  },
  {
    title: '프리미엄',
    badge: '🚀',
    price: '70만원~',
    timeline: '1~2주',
    scope: '풀 서비스',
    examples: 'AI 스토리보드, 관리 시스템',
    revisions: '3회',
    deploy: '배포 + 도메인 연결',
  },
];

const faqs = [
  {
    q: '코딩을 전혀 몰라도 의뢰할 수 있나요?',
    a: '물론입니다. “이런 게 있으면 좋겠다” 수준의 아이디어만 있으면 충분합니다.',
  },
  {
    q: '제 서버에 배포해야 하나요?',
    a: '아니요. Vercel, Cloudflare 같은 무료 서비스로 배포해드려요. 원하시면 직접 서버에도 가능합니다.',
  },
  {
    q: 'AI 기능이 들어가면 API 비용이 따로 드나요?',
    a: '네, AI API 호출 비용은 사용량에 따라 발생합니다. 무료 티어로 가능한 경우 비용 없이 구성합니다.',
  },
  {
    q: '소스 코드도 받을 수 있나요?',
    a: '스탠다드 이상 플랜에서 GitHub 저장소로 전체 소스를 전달드립니다.',
  },
  {
    q: '납품 후 수정이 필요하면요?',
    a: '포함된 수정 횟수 내에서 무료, 이후는 건당 협의합니다.',
  },
];

export default function RequestPage() {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    idea: '',
    budget: '',
    dueDate: '',
    reference: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!formData.name.trim() || !formData.contact.trim() || !formData.idea.trim()) {
      setSubmitError('이름, 연락처, 제작 내용을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
        }),
      });
      if (!response.ok) {
        throw new Error('요청 전송에 실패했습니다.');
      }
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
      setFormData({
        name: '',
        contact: '',
        idea: '',
        budget: '',
        dueDate: '',
        reference: '',
      });
    } catch (error) {
      console.error('Failed to submit request:', error);
      setSubmitError('전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`${noto.className} min-h-screen bg-[#f7f3ff] text-[#1a102a]`}
      style={{
        ['--accent' as string]: '#7b46ff',
        ['--accent-2' as string]: '#ff8ab5',
        ['--ink' as string]: '#1a102a',
        ['--muted' as string]: '#5b5173',
      }}
    >
      <div className="relative overflow-hidden">
        <div className="absolute -top-32 left-1/2 z-0 h-72 w-[120%] -translate-x-1/2 rounded-[999px] bg-[radial-gradient(circle,rgba(123,70,255,0.35),rgba(255,138,181,0.12),transparent_70%)] blur-2xl" />
        <div className="absolute right-10 top-12 z-0 h-20 w-20 rounded-3xl bg-white/70 shadow-xl rotate-12" />
        <div className="absolute left-6 top-44 z-0 h-12 w-12 rounded-2xl bg-white/80 shadow-xl -rotate-6" />

        <section className="relative z-10 container mx-auto px-6 sm:px-8 lg:px-10 pt-16 pb-16 lg:pt-24">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--accent)] shadow">
                <FiZap />
                48시간 바이브 코딩 제작
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-[var(--ink)] tracking-tight">
                머릿속 한 줄을
                <br />
                <span className="text-[var(--accent)]">바로 작동하는 서비스로</span>
              </h1>
              <p className="text-lg sm:text-xl text-[var(--muted)] leading-relaxed">
                35개 이상의 실제 웹앱을 만든 경험으로
                <br />
                당신의 상상을 48시간 안에 작동하는 서비스로 만들어 드립니다.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="#request"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-white font-semibold shadow-lg shadow-violet-300/50 hover:translate-y-[-1px] transition"
                >
                  제작 의뢰하기
                  <FiArrowRight />
                </Link>
                <Link
                  href="/apps"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] px-6 py-3 text-[var(--accent)] font-semibold hover:bg-white/70 transition"
                >
                  포트폴리오 보기
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: '실제 배포 앱', value: '35+' },
                  { label: '납품 평균', value: '48h' },
                  { label: '교육 수강생', value: '100+' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-white/80 p-4 shadow">
                    <p className="text-sm text-[var(--muted)]">{stat.label}</p>
                    <p className="text-2xl font-bold text-[var(--ink)]">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[32px] border border-white/60 bg-white/90 p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--muted)]">Vibe Coding Brief</p>
                  <span className="rounded-full bg-[var(--accent-2)]/20 px-3 py-1 text-xs font-semibold text-[var(--accent-2)]">
                    Live
                  </span>
                </div>
                <div className="mt-6 space-y-4">
                  {[
                    { icon: <FiMessageCircle />, title: '아이디어 러프 스케치', text: '대화로 핵심 목표와 타겟을 정리' },
                    { icon: <FiLayers />, title: '기능 우선순위 설계', text: 'MVP로 시작하고 확장 가능하도록 구성' },
                    { icon: <FiCode />, title: '바이브 코딩 제작', text: '작동하는 결과물을 빠르게 출시' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3 rounded-2xl bg-[#f5f0ff] p-4">
                      <div className="mt-1 text-[var(--accent)]">{item.icon}</div>
                      <div>
                        <p className="font-semibold text-[var(--ink)]">{item.title}</p>
                        <p className="text-sm text-[var(--muted)]">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl border border-dashed border-[var(--accent)]/50 bg-white p-4 text-sm text-[var(--muted)]">
                  진행 상황은 노션/디스코드로 실시간 공유됩니다.
                </div>
              </div>
              <div className="absolute -bottom-8 -left-10 h-20 w-20 rounded-[28px] bg-[var(--accent)]/20 blur-xl" />
              <Image
                src="/memoji-1.svg"
                alt="memoji"
                width={64}
                height={64}
                className="absolute -top-6 right-6 drop-shadow-xl"
              />
              <Image
                src="/memoji-2.svg"
                alt="memoji"
                width={72}
                height={72}
                className="absolute -bottom-8 right-12 drop-shadow-xl"
              />
            </div>
          </div>
        </section>
      </div>

      <section className="container mx-auto px-6 sm:px-8 lg:px-10 py-16">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
          <FiMessageCircle />
          이런 분들에게 딱!
        </div>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[var(--ink)] tracking-tight">
          혹시 이런 고민 중이신가요?
        </h2>
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
          <Image src="/memoji-3.svg" alt="memoji" width={36} height={36} />
          고민을 정리하면 바로 실행 가능한 플로우로 바꿔드려요.
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {painPoints.map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow">
              <p className="text-base font-semibold text-[var(--ink)]">{item.title}</p>
              <div className="mt-3 flex items-start gap-2 text-[var(--muted)]">
                <FiCheckCircle className="mt-1 text-[var(--accent)]" />
                <p>{item.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="portfolio" className="container mx-auto px-6 sm:px-8 lg:px-10 py-16">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
          <FiLayers />
          제작 가능한 것들
        </div>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[var(--ink)]">
          상상하셨던 거, 아마 다 만들 수 있어요
        </h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {portfolioSections.map((section) => (
            <div key={section.title} className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-lg">
              <h3 className="text-xl font-bold text-[var(--ink)]">{section.title}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{section.desc}</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-2xl bg-[#f5f0ff] px-4 py-3 text-xs font-semibold text-[var(--accent)]">
                예시: {section.examples}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-6 sm:px-8 lg:px-10 py-16">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
          <FiClock />
          작업 프로세스
        </div>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[var(--ink)]">
          커피 한 잔 마실 시간이면 기획 끝
        </h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl bg-white/90 p-6 shadow">
            <ol className="space-y-5 text-sm text-[var(--muted)]">
              {[
                '상담 신청 (무료, 30분)',
                '아이디어 정리 & 견적 (당일~1일)',
                '제작 진행 (1~7일)',
                '피드백 & 수정 (2회 포함)',
                '최종 납품',
              ].map((step, idx) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white font-semibold">
                    {idx + 1}
                  </span>
                  <span className="pt-1">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: <FiMessageCircle />, title: '실시간 공유', text: '노션/디스코드로 매일 상태 공유' },
              { icon: <FiEdit3 />, title: '중간 데모', text: '중간 결과물 바로 확인' },
              { icon: <FiPackage />, title: '원스톱 배포', text: 'Vercel/Cloudflare 배포까지' },
              { icon: <FiFileText />, title: '사용법 안내', text: '간단한 사용법 문서 제공' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow">
                <div className="text-[var(--accent)]">{item.icon}</div>
                <h4 className="mt-2 font-semibold text-[var(--ink)]">{item.title}</h4>
                <p className="mt-1 text-sm text-[var(--muted)]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 sm:px-8 lg:px-10 py-16">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
          <FiZap />
          가격 정책
        </div>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[var(--ink)]">
          복잡한 견적서 없이, 딱 세 가지
        </h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div key={plan.title} className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[var(--ink)]">{plan.title}</h3>
                <span className="text-2xl">{plan.badge}</span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-[var(--accent)]">{plan.price}</p>
              <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                <p>작업 기간: {plan.timeline}</p>
                <p>복잡도: {plan.scope}</p>
                <p>예시: {plan.examples}</p>
                <p>수정: {plan.revisions}</p>
                <p>배포: {plan.deploy}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl bg-white/95 p-6 shadow">
            <h4 className="text-lg font-bold text-[var(--ink)]">부가 옵션</h4>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <li>구글 스프레드시트 DB 연동: +5만원</li>
              <li>AI API 연동 (Gemini, Claude 등): +10만원</li>
              <li>관리자 페이지 추가: +15만원</li>
              <li>유지보수 (월): 협의</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-6 shadow">
            <h4 className="text-lg font-bold text-[var(--ink)]">할인 혜택</h4>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <li>교육 기관/비영리: 20% 할인</li>
              <li>재의뢰 고객: 15% 할인</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 sm:px-8 lg:px-10 py-16">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
          <FiCheckCircle />
          신뢰 포인트
        </div>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[var(--ink)]">
          코드만 짜는 게 아닙니다
        </h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-lg">
            <div className="grid grid-cols-2 text-sm font-semibold text-[var(--muted)]">
              <span>일반 외주</span>
              <span>바이브 코딩 제작</span>
            </div>
            <div className="mt-4 space-y-4 text-sm text-[var(--muted)]">
              {[
                ['기획서 없으면 시작 못함', '대화로 함께 기획 정리'],
                ['개발 언어 선택 필요', '최적 기술 알아서 선택'],
                ['수정 요청 시 추가 비용', '기본 수정 횟수 포함'],
                ['납품 후 끝', '간단한 사용법 안내 포함'],
              ].map((row) => (
                <div key={row[0]} className="grid grid-cols-2 gap-4 rounded-2xl bg-[#f5f0ff] px-4 py-3">
                  <span>{row[0]}</span>
                  <span className="font-semibold text-[var(--accent)]">{row[1]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white/95 p-6 shadow-lg">
            <h3 className="text-lg font-bold text-[var(--ink)]">실적</h3>
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-[var(--accent)]" />
                35개+ 실제 배포된 웹앱
              </div>
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-[var(--accent)]" />
                100명+ AI 교육 수강생 (기업/학교)
              </div>
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-[var(--accent)]" />
                Gemini, Claude, ChatGPT API 활용 경험
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 sm:px-8 lg:px-10 py-16">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
          <FiFileText />
          FAQ
        </div>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[var(--ink)]">
          궁금한 거, 미리 답해드릴게요
        </h2>
        <div className="mt-8 space-y-4">
          {faqs.map((item) => (
            <details key={item.q} className="rounded-2xl bg-white/95 p-5 shadow">
              <summary className="cursor-pointer text-base font-semibold text-[var(--ink)]">
                {item.q}
              </summary>
              <p className="mt-3 text-sm text-[var(--muted)]">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="request" className="container mx-auto px-6 sm:px-8 lg:px-10 py-16">
        <div className="rounded-[32px] border border-white/70 bg-white/95 p-8 shadow-2xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
            <FiSend />
            제작 의뢰 신청
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[var(--ink)]">
            30초면 충분해요. 나머지는 제가 연락드릴게요.
          </h2>
          <form className="mt-8 grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--muted)]">이름/닉네임</label>
              <input
                type="text"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                placeholder="홍길동"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--muted)]">연락처 (이메일 또는 카카오톡)</label>
              <input
                type="text"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                placeholder="email@example.com"
                value={formData.contact}
                onChange={(event) => setFormData((prev) => ({ ...prev, contact: event.target.value }))}
              />
            </div>
            <div className="lg:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-[var(--muted)]">어떤 걸 만들고 싶으세요?</label>
              <textarea
                className="h-32 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                placeholder="아이디어를 자유롭게 적어주세요."
                value={formData.idea}
                onChange={(event) => setFormData((prev) => ({ ...prev, idea: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--muted)]">희망 예산 (선택)</label>
              <input
                type="text"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                placeholder="예: 30만원"
                value={formData.budget}
                onChange={(event) => setFormData((prev) => ({ ...prev, budget: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--muted)]">희망 완료일 (선택)</label>
              <input
                type="date"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                value={formData.dueDate}
                onChange={(event) => setFormData((prev) => ({ ...prev, dueDate: event.target.value }))}
              />
            </div>
            <div className="lg:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-[var(--muted)]">참고 링크</label>
              <input
                type="text"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                placeholder="https://example.com"
                value={formData.reference}
                onChange={(event) => setFormData((prev) => ({ ...prev, reference: event.target.value }))}
              />
            </div>
            <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-[var(--muted)]">
                {submitError && <p className="text-red-500">{submitError}</p>}
                {submitSuccess && <p className="text-emerald-500">접수가 완료되었습니다. 빠르게 연락드릴게요!</p>}
                {!submitError && !submitSuccess && <p>접수 후 24시간 내에 연락드립니다.</p>}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-white font-semibold shadow-lg shadow-violet-300/50 hover:translate-y-[-1px] transition disabled:opacity-60"
              >
                ✨ 제작 상담 신청하기
                <FiArrowRight />
              </button>
            </div>
          </form>
        </div>
      </section>

      {submitSuccess && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="rounded-2xl bg-[var(--accent)] text-white px-5 py-4 shadow-2xl flex items-center gap-3">
            <span className="text-xl">✨</span>
            <div>
              <p className="text-sm font-semibold">접수가 완료되었습니다.</p>
              <p className="text-xs text-white/80">빠르게 연락드릴게요!</p>
            </div>
            <button
              type="button"
              onClick={() => setSubmitSuccess(false)}
              className="ml-2 text-white/80 hover:text-white text-sm"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <footer className="container mx-auto px-6 sm:px-8 lg:px-10 py-16">
        <div className="rounded-3xl bg-[#1b122b] text-white p-8 text-center shadow-2xl">
          <p className="text-lg font-semibold">
            아이디어를 품고만 있지 마세요.
          </p>
          <p className="mt-2 text-sm text-white/70">
            세상에 꺼내놓으면, 누군가에겐 분명 쓸모 있을 거예요.
          </p>
        </div>
      </footer>
    </div>
  );
}
