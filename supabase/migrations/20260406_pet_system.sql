-- Pet System Migration

-- 펫 테이블
CREATE TABLE IF NOT EXISTS pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pet_type text NOT NULL DEFAULT 'cat',
  name text,
  exp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  hunger integer NOT NULL DEFAULT 80,
  happiness integer NOT NULL DEFAULT 70,
  growth_stage text NOT NULL DEFAULT 'baby',
  pos_x float NOT NULL DEFAULT 50,
  pos_y float NOT NULL DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view pets" ON pets FOR SELECT USING (true);
CREATE POLICY "Owner can insert pets" ON pets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update pets" ON pets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete pets" ON pets FOR DELETE USING (auth.uid() = user_id);

-- 펫 아이템 인벤토리
CREATE TABLE IF NOT EXISTS pet_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_type)
);

ALTER TABLE pet_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can view own items" ON pet_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert items" ON pet_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update items" ON pet_items FOR UPDATE USING (auth.uid() = user_id);

-- 보상 이력 (중복 방지용)
CREATE TABLE IF NOT EXISTS reward_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  item_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  rewarded_at timestamptz DEFAULT now()
);

ALTER TABLE reward_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can view reward logs" ON reward_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert reward logs" ON reward_logs FOR INSERT WITH CHECK (true);
