-- 입장권(문지기) 모드: true 인 앱은 AI Service Hub / 클래스로그AI 에서 입장권을 받아야만 열린다.
-- 기본값 false → 기존 앱은 아무 변화 없음. 켜기/끄기는 관리자만 앱 등록·수정 화면에서 한다.
alter table apps
  add column if not exists gate_mode boolean not null default false;
