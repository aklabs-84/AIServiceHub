# AI LABS (AI Service Hub)

**AI LABS**는 다양한 인공지능(AI) 서비스와 프롬프트를 한곳에서 탐색하고 공유할 수 있는 플랫폼입니다.
사용자는 유용한 AI 도구를 발견하고, 효과적인 프롬프트를 공유하며 AI 활용 능력을 높일 수 있습니다.

![Project Preview](public/og-image.png)

## ✨ 주요 기능

### 1. AI 앱 (Apps) 탐색
- 챗봇, 이미지 생성, 코딩 도구 등 카테고리별로 분류된 AI 서비스를 쉽게 찾아볼 수 있습니다.
- Google 로그인을 통해 관심 있는 앱의 상세 정보를 확인하고 바로가기를 이용할 수 있습니다.

### 2. 프롬프트 (Prompts) 공유
- 효과적인 AI 사용을 위한 고품질 프롬프트를 공유하고 저장합니다.
- **[New] 카카오 & Google 로그인**: 상세 프롬프트 내용은 로그인한 사용자에게만 공개되는 프리미엄 콘텐츠 기능을 제공합니다.
- 파일 첨부 및 이미지 미리보기를 지원하여 프롬프트의 결과물을 직관적으로 확인 가능합니다.

### 3. 사용자 편의 기능
- **소셜 로그인**: Google 및 Kakao 계정으로 간편하게 가입하고 로그인할 수 있습니다.
- **반응형 디자인**: 모바일, 태블릿, 데스크탑 등 모든 기기에서 최적화된 화면을 제공합니다.
- **관리자 대시보드**: 콘텐츠 및 사용자를 효율적으로 관리할 수 있는 Admin 시스템이 구축되어 있습니다.

---

## 🛠 기술 스택 (Tech Stack)

이 프로젝트는 최신 웹 기술을 기반으로 구축되었습니다.

- **Framework**: [Next.js 14+ (App Router)](https://nextjs.org/)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth (Google, Kakao OAuth)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage

---

## 🚀 시작하기 (Getting Started)

로컬 개발 환경에서 프로젝트를 실행하는 방법입니다.

### 1. 환경 변수 설정
`.env.local` 파일을 생성하고 Supabase 설정 정보를 입력합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. 패키지 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 확인합니다.

---

## 📂 프로젝트 구조

```
ai-service-site/
├── app/                  # Next.js App Router (페이지 및 라우팅)
├── components/           # UI 컴포넌트
├── contexts/             # 전역 상태 관리 (Auth 등)
├── database/             # 데이터베이스 스키마 및 마이그레이션 SQL
├── lib/                  # 유틸리티 함수 및 Supabase 클라이언트
├── public/               # 정적 파일 (이미지, 아이콘)
├── types/                # TypeScript 타입 정의
└── README.md             # 프로젝트 소개 문서
```
