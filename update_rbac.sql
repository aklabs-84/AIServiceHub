-- 1. profiles 테이블에 role 컬럼 추가 (이미 있으면 무시됨)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 2. role 컬럼에 대한 접근 권한 설정
-- 기존 정책이 있다면 삭제하고 다시 생성하여 에러 방지
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Admins can update any profile" 
ON profiles FOR UPDATE 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- 3. 초기 관리자 설정 (비상용 하드코딩된 이메일 계정을 관리자로 승격)
UPDATE profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'mosebb@gmail.com'
);

-- 확인용 쿼리
SELECT * FROM profiles WHERE role = 'admin';
