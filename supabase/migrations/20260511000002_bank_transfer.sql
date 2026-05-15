-- purchases 테이블에 계좌이체 관련 컬럼 추가
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'card';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS depositor_name text;

-- status CHECK 제약 조건에 pending_bank 추가
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_status_check;
ALTER TABLE purchases ADD CONSTRAINT purchases_status_check
  CHECK (status IN ('pending', 'pending_bank', 'paid', 'cancelled', 'refunded'));
