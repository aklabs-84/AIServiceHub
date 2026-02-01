# Supabase 연동/마이그레이션 안정화 정리

이 문서는 **Supabase로 이전 후 발생한 문제를 해결하기 위해 했던 작업**과, **다른 웹앱에서 동일 문제를 예방하기 위한 체크리스트**를 요약합니다.

## 1) 핵심 원인 요약
- 클라이언트에서 **로컬스토리지/세션스토리지** 기반 인증/데이터 로딩이 반복되면서 **무한 로딩/타임아웃/리렌더 폭주** 발생
- Supabase SSR/쿠키 기반 인증이 아닌 클라이언트 기반 인증만 사용하여 **탭 이동, 새로고침, 로그인 갱신 시 상태 불일치**가 발생
- Next.js App Router에서 **Server Component/Client Component 경계 혼란**으로 런타임/빌드 에러 발생
- 카테고리/배지 표시와 같은 **카테고리 매핑 불일치**
- Vercel 배포 시 **TS 타입 추론 실패**나 이미지 도메인 미허용 등으로 빌드 실패

## 2) 우리가 한 작업 요약

### A. Supabase 인증 안정화
- `@supabase/ssr` 기반 **Server Client** 추가
- `lib/supabaseServer.ts` 생성 후 `createServerClient()`로 서버 쿠키 인증 처리
- OAuth 콜백을 **route handler**로 이동
  - `app/auth/callback/route.ts`
  - 기존 `app/auth/callback/page.tsx` 삭제

### B. 서버 데이터 로딩 구조로 전환
- Server Component에서 데이터 로딩 후 Client Component로 전달
- Server 전용 데이터 함수 생성
  - `lib/dbServer.ts` (getAllAppsServer, getPromptByIdServer, getAppsByUserServer 등)
- DB 매핑 함수 통합
  - `lib/dbMappings.ts` (DB → 앱/프롬프트/댓글 매핑)

### C. 페이지 구조 분리
- Server page → Client UI 컴포넌트 분리
  - `app/apps/page.tsx` → `app/apps/AppsClient.tsx`
  - `app/prompts/page.tsx` → `app/prompts/PromptsClient.tsx`
  - `app/content/page.tsx` → `app/content/ContentClient.tsx`
  - `app/my/page.tsx` → `app/my/MyPageClient.tsx`
  - `app/liked-apps`, `app/my-apps`, `app/admin`, `app/admin/users` 등 동일 패턴 적용

### D. 무한 로딩/리프레시 문제 제거
- `useResilientLoader` 제거
- `router.refresh()` 사용 시 로딩 상태를 과도하게 감싸던 UI 제거
- 서버에서 `dynamic = 'force-dynamic'`, `revalidate = 0` 설정으로 데이터 신뢰성 확보

### E. 카테고리/배지 불일치 해결
- 카드 컴포넌트에 `categoryInfo` 명시 전달
- 카테고리 중복 문제 → 서버에서 `Map`으로 dedupe
- 카테고리 로딩 캐싱 추가 (`lib/useCategories.ts`)

### F. 검색 입력 성능/한글 입력 개선
- 검색 입력을 URL 파라미터와 분리
- 디바운스 + IME 조합 처리로 입력 지연 해결
  - `onCompositionStart/End` 활용

### G. Next.js 이미지 도메인 오류 해결
- 카카오 프로필 이미지 도메인(`k.kakaocdn.net`)을 `next.config.ts`에 추가

### H. Vercel 빌드 오류 해결
- `initialUsers` 타입 명시 (`UserProfile[]`) 추가
- TS strict 모드에서 암묵적 any 제거

## 3) 재발 방지 체크리스트

### ✅ 인증
- Supabase는 **SSR + 쿠키 기반 인증**으로 구성
- OAuth 콜백은 `route.ts`에서 처리

### ✅ 데이터 로딩
- 목록/상세 데이터는 **Server Component에서 불러오기**
- Client는 순수 UI/필터/상태 전용

### ✅ 페이지 구조
- Server page → Client UI 구조로 통일
- `dynamic = 'force-dynamic'` / `revalidate = 0` 적용

### ✅ 성능
- 입력 필터는 **디바운스 + IME 처리 필수**
- 반복 호출되는 API는 캐싱 적용

### ✅ 오류 방지
- Next/image 외부 도메인 등록
- TS strict 대응 (any 제거)

## 4) 앞으로 적용할 때 권장 구조

```
app/
  apps/page.tsx            // server
  apps/AppsClient.tsx      // client
lib/
  supabaseServer.ts        // SSR client
  dbServer.ts              // server data fetch
  dbMappings.ts            // mapping
```

## 5) 핵심 정리

> **Supabase 이전 시 가장 큰 문제는 “클라이언트에서 데이터/인증을 모두 처리한 것”**

→ 서버 중심으로 전환하면,
- 무한 로딩
- 탭 이동 시 오류
- 로그인 불일치
- 카테고리 표시 오류
를 거의 대부분 해결할 수 있음.

---

필요하면 이 문서를 기반으로 **공식 템플릿/체크리스트** 버전도 만들어 줄 수 있음.

---

# 공식 템플릿/체크리스트

아래 템플릿은 Supabase 연동 및 마이그레이션 작업 시 그대로 복사해 사용하도록 구성했습니다.

## 템플릿

```
프로젝트명:
배포 환경: (Vercel/기타)
인증 방식: (Supabase SSR + Cookie)
OAuth 제공자: (Google/Kakao/기타)
DB 테이블:
- apps
- prompts
- comments
- profiles
- categories

목표:
- 무한 로딩 제거
- 로그인 상태 안정화
- 카테고리/배지 일관성 확보
- Vercel 빌드 오류 제거

주요 변경 사항:
1) 서버 인증 구성
2) 서버 데이터 로딩 전환
3) 페이지 구조 분리 (Server/Page + Client/UI)
4) 입력/필터 성능 개선 (디바운스 + IME)
5) 이미지/도메인/타입 오류 해결

작업 파일:
- lib/supabaseServer.ts
- lib/dbServer.ts
- lib/dbMappings.ts
- app/auth/callback/route.ts
- app/*/page.tsx (server)
- app/*/*Client.tsx (client)
- next.config.ts

검증 항목:
- 로그인/로그아웃 정상 동작
- 탭 이동 후 데이터 정상 로딩
- 앱/프롬프트 목록 검색 입력 정상
- 상세 페이지 진입 및 댓글 정상
- 카테고리/배지 표시 일치
- Vercel 빌드 성공
```

## 체크리스트

- [ ] Supabase 서버 인증(`@supabase/ssr`) 적용
- [ ] OAuth 콜백을 `route.ts`로 이동
- [ ] Server Component에서 데이터 로딩
- [ ] Client Component는 UI 전용으로 분리
- [ ] `dynamic = 'force-dynamic'` / `revalidate = 0` 적용
- [ ] 카테고리 중복 제거 및 매핑 일관화
- [ ] 검색 입력 디바운스 + IME 조합 처리
- [ ] Next/image 외부 도메인 등록
- [ ] TS implicit any 제거 및 타입 보강
- [ ] Vercel 빌드 로그 확인
