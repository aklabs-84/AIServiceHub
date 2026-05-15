-- ============================================================
-- Payment System Migration
-- purchases, subscriptions 테이블 + price/is_paid 컬럼
-- ============================================================

-- apps, prompts에 판매 관련 컬럼 추가
ALTER TABLE apps    ADD COLUMN IF NOT EXISTS price    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE apps    ADD COLUMN IF NOT EXISTS is_paid  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS price    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS is_paid  BOOLEAN NOT NULL DEFAULT false;

-- -------------------------
-- purchases (구매 이력)
-- -------------------------
CREATE TABLE IF NOT EXISTS purchases (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_type TEXT    NOT NULL CHECK (product_type IN ('app', 'prompt', 'subscription')),
  product_id   UUID,
  amount       INTEGER NOT NULL,
  order_id     TEXT    NOT NULL UNIQUE,
  payment_key  TEXT,
  status       TEXT    NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchases_select" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "purchases_insert" ON purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- -------------------------
-- subscriptions (구독 상태)
-- -------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  plan        TEXT NOT NULL DEFAULT 'monthly' CHECK (plan IN ('monthly', 'yearly')),
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'cancelled', 'expired')),
  billing_key TEXT,
  order_id    TEXT UNIQUE,
  amount      INTEGER NOT NULL DEFAULT 9900,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_insert" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_update" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- -------------------------
-- 인덱스 (조회 성능)
-- -------------------------
CREATE INDEX IF NOT EXISTS purchases_user_id_idx       ON purchases (user_id);
CREATE INDEX IF NOT EXISTS purchases_product_idx       ON purchases (product_type, product_id);
CREATE INDEX IF NOT EXISTS purchases_status_idx        ON purchases (status);
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx   ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_expires_at_idx ON subscriptions (expires_at);
