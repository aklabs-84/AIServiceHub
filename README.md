# AI LABS

바이브코딩으로 만든 AI 앱과 프롬프트를 실험·보관·공유하는 플랫폼입니다.

## 주요 기능

- **앱 소개**: Google AI Studio에서 만든 어플리케이션을 카드 형식으로 나열
- **카테고리 분류**: 챗봇, 콘텐츠 생성, 데이터 분석 등 9가지 카테고리로 앱 분류
- **인증 시스템**: Google 계정 기반 로그인
- **권한 관리**:
  - 비로그인 사용자: 홈 화면에서 앱 목록 조회 가능
  - 로그인 사용자: 앱 상세 정보 및 URL 확인 가능
- **앱 관리**: 앱 등록, 수정, 삭제 기능
- **썸네일 시스템**: 썸네일 이미지가 없으면 카테고리 아이콘으로 대체
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원

## 기술 스택

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Authentication (Google OAuth)
- **Database**: Firestore
- **Icons**: React Icons

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. Supabase 설정 (Firebase Removed)

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. Authentication에서 Google 로그인 활성화
3. Firestore Database 생성
4. `.env.local` 파일에 Firebase 구성 정보 입력:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Firestore 보안 규칙 설정

Firebase Console에서 Firestore Database > 규칙 탭에 다음 규칙을 설정:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /apps/{appId} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.resource.data.createdBy == request.auth.uid;
      allow update, delete: if request.auth != null
                            && resource.data.createdBy == request.auth.uid;
    }
  }
}
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
ai-service-site/
├── app/                      # Next.js App Router 페이지
│   ├── apps/
│   │   ├── [id]/            # 앱 상세 페이지
│   │   │   ├── edit/        # 앱 수정 페이지
│   │   │   └── page.tsx
│   │   └── new/             # 앱 등록 페이지
│   ├── my-apps/             # 내 앱 목록 페이지
│   ├── layout.tsx           # 루트 레이아웃
│   └── page.tsx             # 홈 페이지
├── components/              # 재사용 가능한 컴포넌트
│   ├── AppCard.tsx         # 앱 카드 컴포넌트
│   └── Header.tsx          # 헤더 컴포넌트
├── contexts/               # React Context
│   └── AuthContext.tsx     # 인증 Context
├── lib/                    # 유틸리티 및 설정
│   ├── categories.tsx      # 카테고리 정의
│   ├── db.ts              # Firestore 데이터베이스 함수
│   └── firebase.ts        # Firebase 초기화
└── types/                 # TypeScript 타입 정의
    └── app.ts             # 앱 타입 정의
```

## 카테고리

- 챗봇 (Chatbot)
- 콘텐츠 생성 (Content Generation)
- 데이터 분석 (Data Analysis)
- 이미지 생성 (Image Generation)
- 코드 어시스턴트 (Code Assistant)
- 번역 (Translation)
- 교육 (Education)
- 생산성 (Productivity)
- 기타 (Other)

## 사용 방법

### 앱 둘러보기
1. 홈 페이지에서 등록된 모든 앱을 카드 형식으로 확인
2. 카테고리 필터를 사용하여 원하는 카테고리의 앱만 표시
3. 앱 카드를 클릭하여 기본 정보 확인

### 앱 상세 정보 보기
1. Google 계정으로 로그인
2. 앱 카드를 클릭하여 상세 페이지 이동
3. 앱 설명, URL 등 전체 정보 확인

### 앱 등록하기
1. Google 계정으로 로그인
2. 헤더의 "앱 등록" 버튼 클릭
3. 앱 정보 입력:
   - 앱 이름
   - 설명
   - Google AI Studio 공유 URL
   - 카테고리
   - 썸네일 이미지 URL (선택사항)
4. "등록하기" 버튼 클릭

### 내 앱 관리하기
1. 헤더의 "내 앱" 메뉴 클릭
2. 등록한 앱 목록 확인
3. 앱 상세 페이지에서 "수정" 또는 "삭제" 버튼 사용

## 배포

### Vercel 배포 (권장)

1. GitHub에 프로젝트 푸시
2. [Vercel](https://vercel.com)에 로그인
3. "New Project" 클릭
4. GitHub 레포지토리 선택
5. 환경 변수 설정 (Firebase 구성)
6. "Deploy" 클릭

### 환경 변수 설정
배포 플랫폼에서 다음 환경 변수를 설정해야 합니다:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## 라이선스

MIT License
