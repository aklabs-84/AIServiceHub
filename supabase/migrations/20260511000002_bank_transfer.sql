-- purchases 테이블에 계좌이체 관련 컬럼 추가
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'card';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS depositor_name text;

-- pending_bank 상태 허용 (기존 check constraint 있으면 교체)
-- status: pending | pending_bank | paid | cancelled | refunded
