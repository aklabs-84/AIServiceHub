-- Room items: furniture/props placed in the virtual space
CREATE TABLE IF NOT EXISTS room_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  asset_id text NOT NULL,
  pos_x float NOT NULL DEFAULT 50,
  pos_y float NOT NULL DEFAULT 60,
  z_idx integer NOT NULL DEFAULT 2,
  item_scale float NOT NULL DEFAULT 1.0,
  flip_x boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE room_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view room items" ON room_items FOR SELECT USING (true);
CREATE POLICY "Owner can manage room items" ON room_items FOR ALL USING (auth.uid() = user_id);

-- Character config per user
CREATE TABLE IF NOT EXISTS room_character (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  skin text NOT NULL DEFAULT 'beige',
  hair text NOT NULL DEFAULT 'brown',
  outfit text NOT NULL DEFAULT 'blue',
  anim text NOT NULL DEFAULT 'idle',
  pos_x float NOT NULL DEFAULT 50,
  pos_y float NOT NULL DEFAULT 65,
  room_theme text NOT NULL DEFAULT 'cozy',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE room_character ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view character" ON room_character FOR SELECT USING (true);
CREATE POLICY "Owner can manage character" ON room_character FOR ALL USING (auth.uid() = user_id);
