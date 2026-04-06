export type AssetCategory = 'furniture' | 'tech' | 'plants' | 'deco' | 'music';

export interface Asset {
  id: string;
  label: string;
  emoji: string;
  category: AssetCategory;
  defaultScale: number;
  defaultZ: number; // 1=floor 2=mid 3=wall
}

export const ASSETS: Asset[] = [
  // Furniture
  { id: 'sofa',       label: '소파',    emoji: '🛋️', category: 'furniture', defaultScale: 2.0, defaultZ: 2 },
  { id: 'chair',      label: '의자',    emoji: '🪑', category: 'furniture', defaultScale: 1.4, defaultZ: 2 },
  { id: 'bed',        label: '침대',    emoji: '🛏️', category: 'furniture', defaultScale: 2.2, defaultZ: 2 },
  { id: 'table',      label: '테이블',  emoji: '🪵', category: 'furniture', defaultScale: 1.6, defaultZ: 2 },
  { id: 'mirror',     label: '거울',    emoji: '🪞', category: 'furniture', defaultScale: 1.4, defaultZ: 3 },
  { id: 'wardrobe',   label: '옷장',    emoji: '🚪', category: 'furniture', defaultScale: 1.8, defaultZ: 3 },
  { id: 'bathtub',    label: '욕조',    emoji: '🛁', category: 'furniture', defaultScale: 1.8, defaultZ: 2 },

  // Tech
  { id: 'tv',         label: 'TV',      emoji: '📺', category: 'tech',      defaultScale: 1.8, defaultZ: 3 },
  { id: 'computer',   label: '컴퓨터',  emoji: '🖥️', category: 'tech',      defaultScale: 1.4, defaultZ: 2 },
  { id: 'laptop',     label: '노트북',  emoji: '💻', category: 'tech',      defaultScale: 1.2, defaultZ: 2 },
  { id: 'game',       label: '게임기',  emoji: '🎮', category: 'tech',      defaultScale: 1.0, defaultZ: 2 },
  { id: 'speaker',    label: '스피커',  emoji: '🔊', category: 'tech',      defaultScale: 1.1, defaultZ: 2 },
  { id: 'camera',     label: '카메라',  emoji: '📷', category: 'tech',      defaultScale: 1.0, defaultZ: 2 },

  // Plants
  { id: 'plant1',     label: '새싹',    emoji: '🌱', category: 'plants',    defaultScale: 1.1, defaultZ: 2 },
  { id: 'plant2',     label: '화분',    emoji: '🪴', category: 'plants',    defaultScale: 1.4, defaultZ: 2 },
  { id: 'cactus',     label: '선인장',  emoji: '🌵', category: 'plants',    defaultScale: 1.3, defaultZ: 2 },
  { id: 'sunflower',  label: '해바라기', emoji: '🌻', category: 'plants',   defaultScale: 1.2, defaultZ: 2 },
  { id: 'bouquet',    label: '꽃다발',  emoji: '💐', category: 'plants',    defaultScale: 1.1, defaultZ: 2 },
  { id: 'tree',       label: '나무',    emoji: '🌳', category: 'plants',    defaultScale: 1.8, defaultZ: 2 },

  // Deco
  { id: 'picture',    label: '그림',    emoji: '🖼️', category: 'deco',      defaultScale: 1.3, defaultZ: 3 },
  { id: 'lamp',       label: '스탠드',  emoji: '🪔', category: 'deco',      defaultScale: 1.2, defaultZ: 2 },
  { id: 'book',       label: '책',      emoji: '📚', category: 'deco',      defaultScale: 1.2, defaultZ: 2 },
  { id: 'globe',      label: '지구본',  emoji: '🌍', category: 'deco',      defaultScale: 1.1, defaultZ: 2 },
  { id: 'trophy',     label: '트로피',  emoji: '🏆', category: 'deco',      defaultScale: 1.1, defaultZ: 2 },
  { id: 'coffee',     label: '커피',    emoji: '☕', category: 'deco',      defaultScale: 0.9, defaultZ: 2 },
  { id: 'candle',     label: '캔들',    emoji: '🕯️', category: 'deco',      defaultScale: 0.9, defaultZ: 2 },
  { id: 'star',       label: '별',      emoji: '⭐', category: 'deco',      defaultScale: 0.9, defaultZ: 3 },
  { id: 'moon',       label: '달',      emoji: '🌙', category: 'deco',      defaultScale: 1.0, defaultZ: 3 },
  { id: 'rainbow',    label: '무지개',  emoji: '🌈', category: 'deco',      defaultScale: 1.2, defaultZ: 3 },

  // Music
  { id: 'piano',      label: '피아노',  emoji: '🎹', category: 'music',     defaultScale: 1.8, defaultZ: 2 },
  { id: 'guitar',     label: '기타',    emoji: '🎸', category: 'music',     defaultScale: 1.3, defaultZ: 3 },
  { id: 'drum',       label: '드럼',    emoji: '🥁', category: 'music',     defaultScale: 1.5, defaultZ: 2 },
  { id: 'violin',     label: '바이올린', emoji: '🎻', category: 'music',    defaultScale: 1.1, defaultZ: 3 },
  { id: 'microphone', label: '마이크',  emoji: '🎤', category: 'music',     defaultScale: 1.0, defaultZ: 2 },
  { id: 'note',       label: '음표',    emoji: '🎵', category: 'music',     defaultScale: 0.9, defaultZ: 3 },

];

export const ASSET_MAP = Object.fromEntries(ASSETS.map(a => [a.id, a]));

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  furniture: '🪑 가구',
  tech:      '💻 테크',
  plants:    '🌿 식물',
  deco:      '🖼️ 데코',
  music:     '🎵 음악',
};

export const ROOM_THEMES = [
  { id: 'cozy',    label: '🏠 아늑',  floor: '#c8a87a', wall: '#f5e6d3', skirting: '#a07850' },
  { id: 'modern',  label: '🏢 모던',  floor: '#7a6a5a', wall: '#e8e8e8', skirting: '#5a4a3a' },
  { id: 'pastel',  label: '🌸 파스텔', floor: '#d4a8c8', wall: '#fce4ec', skirting: '#b088a8' },
  { id: 'forest',  label: '🌿 자연',  floor: '#6a8c5a', wall: '#e8f5e9', skirting: '#4a6c3a' },
  { id: 'night',   label: '🌙 나이트', floor: '#2d3748', wall: '#1a202c', skirting: '#1a2030' },
  { id: 'ocean',   label: '🌊 오션',  floor: '#5a8aaa', wall: '#e3f2fd', skirting: '#3a6a8a' },
];

export const SKIN_TONES = [
  { id: 'beige',  label: '밝은', color: '#ffd5b5' },
  { id: 'warm',   label: '웜',   color: '#e8b896' },
  { id: 'tan',    label: '황갈', color: '#c8906a' },
  { id: 'brown',  label: '갈색', color: '#a06040' },
  { id: 'dark',   label: '다크', color: '#703820' },
];

export const HAIR_COLORS = [
  { id: 'black',   label: '검정', color: '#1a1a1a' },
  { id: 'brown',   label: '갈색', color: '#6b3d1e' },
  { id: 'blonde',  label: '금발', color: '#e8c850' },
  { id: 'red',     label: '빨강', color: '#c03020' },
  { id: 'purple',  label: '보라', color: '#7030a0' },
  { id: 'blue',    label: '파랑', color: '#2060c0' },
  { id: 'pink',    label: '핑크', color: '#e060a0' },
  { id: 'white',   label: '흰색', color: '#f0f0f0' },
];

export const OUTFIT_COLORS = [
  { id: 'blue',   label: '파랑', color: '#4c8bf5' },
  { id: 'red',    label: '빨강', color: '#e53935' },
  { id: 'green',  label: '초록', color: '#43a047' },
  { id: 'purple', label: '보라', color: '#8e24aa' },
  { id: 'orange', label: '주황', color: '#fb8c00' },
  { id: 'pink',   label: '핑크', color: '#e91e8c' },
  { id: 'gray',   label: '회색', color: '#607d8b' },
  { id: 'black',  label: '검정', color: '#212121' },
];

export const ANIMATIONS = [
  { id: 'idle',   label: '🧍 서있기' },
  { id: 'walk',   label: '🚶 걷기' },
  { id: 'wave',   label: '👋 손흔들기' },
  { id: 'sit',    label: '🪑 앉기' },
  { id: 'dance',  label: '💃 춤추기' },
  { id: 'sleep',  label: '😴 자기' },
  { id: 'think',  label: '🤔 생각하기' },
];

// ── Pet System ─────────────────────────────────────────────────────
export interface PetType {
  id: string; label: string; emoji: string;
  unlockAt: number;
  body: string; accent: string; eye: string;
}

export const PET_TYPES: PetType[] = [
  { id: 'cat',     label: '고양이', emoji: '🐱', unlockAt: 0,   body: '#e8923a', accent: '#fde8c8', eye: '#2d8a4e' },
  { id: 'dog',     label: '강아지', emoji: '🐶', unlockAt: 5,   body: '#c8820a', accent: '#f5e0b0', eye: '#6b3d1e' },
  { id: 'rabbit',  label: '토끼',   emoji: '🐰', unlockAt: 10,  body: '#e8e8e8', accent: '#ffb3c1', eye: '#4090e0' },
  { id: 'fox',     label: '여우',   emoji: '🦊', unlockAt: 20,  body: '#d4541a', accent: '#f5f0e8', eye: '#c07820' },
  { id: 'panda',   label: '판다',   emoji: '🐼', unlockAt: 35,  body: '#f5f5f5', accent: '#2a2a2a', eye: '#2a2a2a' },
  { id: 'unicorn', label: '유니콘', emoji: '🦄', unlockAt: 60,  body: '#f0f0f8', accent: '#e8b0d8', eye: '#6060d0' },
  { id: 'dragon',  label: '드래곤', emoji: '🐉', unlockAt: 100, body: '#3a8a3a', accent: '#1a5a1a', eye: '#d4a020' },
  // ── AI 특별 펫 (게시글 달성 보상) ────────────────────────────────────────────
  { id: 'pixel',  label: '픽셀',   emoji: '🌈', unlockAt: 150, body: '#ff80c0', accent: '#ffe4f8', eye: '#6040ff' },
  { id: 'vibe',   label: '바이브', emoji: '☁️', unlockAt: 200, body: '#c8e8f8', accent: '#ffffff',  eye: '#4878d0' },
  { id: 'byte',   label: '바이트', emoji: '🐛', unlockAt: 350, body: '#2a7a2a', accent: '#80e860',  eye: '#00e060' },
  { id: 'prompy', label: '프롬피', emoji: '💬', unlockAt: 600, body: '#8878f0', accent: '#e0d8ff',  eye: '#ffffff' },
  { id: 'claudy', label: '클로디', emoji: '🤖', unlockAt: 1000,body: '#7040c8', accent: '#d8c8ff',  eye: '#40e8ff' },
];
export const PET_TYPE_MAP = Object.fromEntries(PET_TYPES.map(p => [p.id, p]));

export interface PetItem {
  id: string; label: string; emoji: string;
  hungerUp: number; happinessUp: number; exp: number;
}
export const PET_ITEMS: PetItem[] = [
  { id: 'apple',  label: '사과', emoji: '🍎', hungerUp: 20, happinessUp: 5,  exp: 5  },
  { id: 'snack',  label: '간식', emoji: '🍖', hungerUp: 12, happinessUp: 20, exp: 6  },
  { id: 'salmon', label: '연어', emoji: '🍣', hungerUp: 40, happinessUp: 15, exp: 15 },
  { id: 'cookie', label: '쿠키', emoji: '🍪', hungerUp: 10, happinessUp: 15, exp: 3  },
  { id: 'milk',   label: '우유', emoji: '🥛', hungerUp: 15, happinessUp: 10, exp: 2  },
];
export const PET_ITEM_MAP = Object.fromEntries(PET_ITEMS.map(i => [i.id, i]));

export interface GrowthStage {
  id: 'baby' | 'young' | 'adult' | 'special';
  label: string; minExp: number; scale: number;
}
export const GROWTH_STAGES: GrowthStage[] = [
  { id: 'baby',    label: '🥚 아기',   minExp: 0,  scale: 0.6 },
  { id: 'young',   label: '🌱 청소년', minExp: 16, scale: 0.8 },
  { id: 'adult',   label: '🌟 어른',   minExp: 41, scale: 1.0 },
  { id: 'special', label: '✨ 특별',   minExp: 81, scale: 1.2 },
];
export function getGrowthStage(exp: number): GrowthStage {
  return [...GROWTH_STAGES].reverse().find(s => exp >= s.minExp) ?? GROWTH_STAGES[0];
}
