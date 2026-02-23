-- Editorial Collections Table
-- App Store 스타일 기획 섹션 관리

CREATE TABLE IF NOT EXISTS editorial_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  subtitle TEXT,
  title TEXT NOT NULL,
  description TEXT,
  card_image_url TEXT,
  hero_image_url TEXT,
  editorial_content TEXT,
  app_ids UUID[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 설정
ALTER TABLE editorial_collections ENABLE ROW LEVEL SECURITY;

-- 공개된 컬렉션은 누구나 조회 가능
CREATE POLICY "Published collections are viewable by everyone"
  ON editorial_collections FOR SELECT
  USING (is_published = true);

-- 관리자는 모든 작업 가능
CREATE POLICY "Admins can manage all collections"
  ON editorial_collections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_editorial_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER editorial_collections_updated_at
  BEFORE UPDATE ON editorial_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_editorial_collections_updated_at();
