'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import PetSprite, { type PetAnim } from './PetSprite';
import {
  ASSETS, ASSET_MAP, CATEGORY_LABELS, ROOM_THEMES,
  PET_TYPES, PET_ITEMS, PET_ITEM_MAP, GROWTH_STAGES, getGrowthStage,
  type AssetCategory,
} from './ASSETS';

// ── Types ──────────────────────────────────────────────────────────
type RoomItem = {
  id: string; asset_id: string;
  pos_x: number; pos_y: number; z_idx: number;
  item_scale: number; flip_x: boolean;
};

type PetState = {
  id: string; pet_type: string; name: string | null;
  exp: number; level: number; hunger: number; happiness: number;
  growth_stage: string; pos_x: number; pos_y: number;
  // client-only
  anim: PetAnim; flip: boolean;
};

type PetWalkState = {
  x: number; y: number;
  targetX: number; targetY: number;
  flip: boolean;
  pauseUntil: number;
  eatUntil: number;
  happyUntil: number;
};

type InventoryItem = { item_type: string; quantity: number };

interface RoomCanvasProps { ownerId: string; isOwner: boolean; isAdmin?: boolean }

const THEME = ROOM_THEMES[0];

// ── Main Component ─────────────────────────────────────────────────
export default function RoomCanvas({ ownerId, isOwner, isAdmin = false }: RoomCanvasProps) {
  const roomRef = useRef<HTMLDivElement>(null);

  // ── Data state
  const [items, setItems]         = useState<RoomItem[]>([]);
  const [pets, setPets]           = useState<PetState[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [roomTheme, setRoomTheme] = useState(ROOM_THEMES[0]);
  const [loading, setLoading]     = useState(true);

  // ── UI state
  const [mode, setMode]             = useState<'view' | 'place' | 'pet'>('view');
  const [selCategory, setSelCategory] = useState<AssetCategory>('furniture');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [petPanelTab, setPetPanelTab] = useState<'mine' | 'add'>('mine');
  const [feedingPetId, setFeedingPetId] = useState<string | null>(null);
  const [addingPet, setAddingPet]   = useState(false);
  const [totalPosts, setTotalPosts] = useState(0);
  const [hiddenPetIds, setHiddenPetIds] = useState<Set<string>>(new Set());
  // 먹이 효과 플로팅 이모지: { id, petId, emoji, x, y }
  const [feedEffects, setFeedEffects] = useState<{ id: number; emoji: string; x: number; y: number }[]>([]);
  const feedEffectId = useRef(0);

  // ── Refs
  const dragOffset   = useRef({ x: 0, y: 0 });
  const itemMoved    = useRef(false);
  const saveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assetDragRef = useRef<{ assetId: string; startX: number; startY: number } | null>(null);
  const isDraggingAsset = useRef(false);
  const [assetGhost, setAssetGhost] = useState<{ assetId: string; x: number; y: number } | null>(null);

  // Pet walk
  const petWalkRef = useRef<Map<string, PetWalkState>>(new Map());
  const petsRef    = useRef<PetState[]>([]);
  const petRafRef  = useRef<number | null>(null);

  const theme = roomTheme;

  // ── Load room data ──────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch(`/api/room?owner_id=${ownerId}`).then(r => r.json()),
      fetch(`/api/pets?owner_id=${ownerId}`).then(r => r.json()),
    ]).then(([roomData, petsData]) => {
      if (roomData.items) setItems(roomData.items);
      if (roomData.character?.room_theme) {
        const t = ROOM_THEMES.find(t => t.id === roomData.character.room_theme);
        if (t) setRoomTheme(t);
      }
      if (petsData.total_posts !== undefined) setTotalPosts(petsData.total_posts);
      const rawPets = Array.isArray(petsData) ? petsData : (petsData.pets ?? []);
      if (rawPets.length > 0 || petsData.pets !== undefined) {
        const clientPets: PetState[] = rawPets.map((p: Omit<PetState, 'anim' | 'flip'>) => ({
          ...p, anim: 'idle' as PetAnim, flip: Math.random() > 0.5,
        }));
        setPets(clientPets);
        // Initialize walk states
        clientPets.forEach(p => {
          petWalkRef.current.set(p.id, {
            x: p.pos_x, y: p.pos_y,
            targetX: 10 + Math.random() * 80,
            targetY: 54 + Math.random() * 16,
            flip: Math.random() > 0.5,
            pauseUntil: Date.now() + Math.random() * 1500,
            eatUntil: 0, happyUntil: 0,
          });
        });
      }
    }).finally(() => setLoading(false));
  }, [ownerId]);

  // Load inventory (owner only)
  useEffect(() => {
    if (!isOwner) return;
    fetch('/api/pet-items').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setInventory(data);
    });
  }, [isOwner]);

  // Keep petsRef in sync
  useEffect(() => { petsRef.current = pets; }, [pets]);

  // ── Pet auto-walk RAF ─────────────────────────────────────────
  useEffect(() => {
    const SPEED = 0.13;
    const tick = () => {
      const now = Date.now();
      const prev = petsRef.current;
      if (prev.length > 0) {
        let changed = false;
        const next = prev.map(pet => {
          const ws = petWalkRef.current.get(pet.id);
          if (!ws) return pet;

          // Eat animation override
          if (now < ws.eatUntil) {
            const np = { ...pet, anim: 'eat' as PetAnim, flip: ws.flip };
            if (pet.anim !== 'eat') { changed = true; return np; }
            return pet;
          }
          // Happy animation override
          if (now < ws.happyUntil) {
            const np = { ...pet, anim: 'happy' as PetAnim, flip: ws.flip };
            if (pet.anim !== 'happy') { changed = true; return np; }
            return pet;
          }

          const baseAnim: PetAnim = pet.hunger < 20 ? 'sleep'
            : pet.happiness < 30 ? 'sad'
            : 'idle';

          if (now < ws.pauseUntil) {
            if (pet.anim !== baseAnim || pet.flip !== ws.flip) {
              changed = true;
              return { ...pet, anim: baseAnim, flip: ws.flip };
            }
            return pet;
          }

          const dx = ws.targetX - ws.x;
          const dy = ws.targetY - ws.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 1.5) {
            ws.pauseUntil = now + 1000 + Math.random() * 2500;
            ws.targetX = 8 + Math.random() * 84;
            ws.targetY = 54 + Math.random() * 16; // floor area only (54~70%)
            // Occasional curious/happy burst
            if (pet.happiness > 75 && Math.random() < 0.15) ws.happyUntil = now + 1200;
            if (Math.random() < 0.1) return { ...pet, anim: 'curious' as PetAnim, flip: ws.flip };
            changed = true;
            return { ...pet, anim: baseAnim, flip: ws.flip };
          }

          const nx = ws.x + (dx / dist) * SPEED;
          const ny = ws.y + (dy / dist) * SPEED;
          ws.x = nx; ws.y = ny; ws.flip = dx > 0; // 스프라이트 기본 방향이 왼쪽이므로, 오른쪽 이동 시 flip
          changed = true;
          return { ...pet, pos_x: nx, pos_y: ny, anim: 'walk' as PetAnim, flip: ws.flip };
        });
        if (changed) setPets(next);
      }
      petRafRef.current = requestAnimationFrame(tick);
    };
    petRafRef.current = requestAnimationFrame(tick);
    return () => { if (petRafRef.current) cancelAnimationFrame(petRafRef.current); };
  }, []); // runs once, reads from petsRef

  // ── Stat decay (owner only — hunger/happiness decrease over time) ──────────
  useEffect(() => {
    if (!isOwner) return;
    const DECAY_INTERVAL = 5 * 60 * 1000; // 5 minutes
    const id = setInterval(() => {
      setPets(prev => {
        const updated = prev.map(p => ({
          ...p,
          hunger:    Math.max(0, p.hunger    - 2),
          happiness: Math.max(0, p.happiness - 1),
        }));
        // Sync ref and persist each changed pet
        petsRef.current = updated;
        updated.forEach((p, i) => {
          const o = prev[i];
          if (o.hunger !== p.hunger || o.happiness !== p.happiness) {
            fetch('/api/pets', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: p.id, hunger: p.hunger, happiness: p.happiness }),
            }).catch(() => {});
          }
        });
        return updated;
      });
    }, DECAY_INTERVAL);
    return () => clearInterval(id);
  }, [isOwner]);

  // ── Save helpers ─────────────────────────────────────────────
  const debounceSaveItem = useCallback((id: string, patch: Partial<Pick<RoomItem, 'pos_x'|'pos_y'|'item_scale'>>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/room', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) });
    }, 600);
  }, []);

  // ── Furniture drag ─────────────────────────────────────────
  const getPct = (e: React.PointerEvent | PointerEvent) => {
    const rect = roomRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left  - dragOffset.current.x) / rect.width)  * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top   - dragOffset.current.y) / rect.height) * 100)),
    };
  };

  const onItemPointerDown = (e: React.PointerEvent, id: string, curX: number, curY: number) => {
    if (!isOwner) return;
    e.stopPropagation();
    const roomRect = roomRef.current!.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - roomRect.left - (curX / 100) * roomRect.width,
      y: e.clientY - roomRect.top  - (curY / 100) * roomRect.height,
    };
    itemMoved.current = false;
    setDraggingId(id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isOwner || !draggingId) return;
    itemMoved.current = true;
    const { x, y } = getPct(e);
    setItems(prev => prev.map(it => it.id === draggingId ? { ...it, pos_x: x, pos_y: y } : it));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (draggingId) {
      const item = items.find(it => it.id === draggingId);
      if (item) {
        if (itemMoved.current) {
          debounceSaveItem(item.id, { pos_x: item.pos_x, pos_y: item.pos_y });
          setSelectedId(null);
        } else {
          setSelectedId(prev => prev === draggingId ? null : draggingId);
        }
      }
      setDraggingId(null);
    } else {
      setSelectedId(null);
    }
  };

  const changeScale = (id: string, delta: number) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const next = Math.max(0.5, Math.min(4.0, Math.round((it.item_scale + delta) * 10) / 10));
      debounceSaveItem(id, { item_scale: next });
      return { ...it, item_scale: next };
    }));
  };

  // ── Add furniture item ──────────────────────────────────────
  const addItemAt = useCallback(async (assetId: string, pos_x: number, pos_y: number) => {
    const asset = ASSET_MAP[assetId];
    if (!asset) return;
    const res = await fetch('/api/room', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset_id: assetId, pos_x, pos_y, z_idx: asset.defaultZ, item_scale: asset.defaultScale }),
    });
    if (!res.ok) { console.error('room item add failed', await res.text()); return; }
    const newItem = await res.json();
    if (newItem?.id) setItems(prev => [...prev, newItem]);
  }, []);

  // ── Asset picker drag ──────────────────────────────────────
  const onAssetPointerDown = useCallback((e: React.PointerEvent, assetId: string) => {
    e.preventDefault();
    assetDragRef.current = { assetId, startX: e.clientX, startY: e.clientY };
    isDraggingAsset.current = false;
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    const THRESHOLD = 6;
    const onMove = (e: PointerEvent) => {
      if (!assetDragRef.current) return;
      const dx = e.clientX - assetDragRef.current.startX;
      const dy = e.clientY - assetDragRef.current.startY;
      if (Math.sqrt(dx*dx + dy*dy) > THRESHOLD) {
        isDraggingAsset.current = true;
        setAssetGhost({ assetId: assetDragRef.current.assetId, x: e.clientX, y: e.clientY });
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!assetDragRef.current) return;
      const { assetId } = assetDragRef.current;
      if (isDraggingAsset.current) {
        if (roomRef.current) {
          const rect = roomRef.current.getBoundingClientRect();
          if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
            addItemAt(assetId, ((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100);
          }
        }
      } else {
        addItemAt(assetId, 20 + Math.random() * 60, 52 + Math.random() * 16);
      }
      assetDragRef.current = null;
      isDraggingAsset.current = false;
      setAssetGhost(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [isOwner, addItemAt]);

  // ── Delete furniture ────────────────────────────────────────
  const deleteItem = async (id: string) => {
    await fetch(`/api/room?id=${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // ── Pet management ─────────────────────────────────────────
  const adoptPet = async (pet_type: string) => {
    setAddingPet(true);
    const res = await fetch('/api/pets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pet_type }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); setAddingPet(false); return; }
    const newPet: PetState = { ...data, anim: 'idle', flip: false };
    // Sync petsRef FIRST to prevent RAF race condition overwriting new pet
    const updatedPets = [...petsRef.current, newPet];
    petsRef.current = updatedPets;
    setPets(updatedPets);
    petWalkRef.current.set(data.id, {
      x: data.pos_x, y: data.pos_y,
      targetX: 10 + Math.random() * 80, targetY: 54 + Math.random() * 16,
      flip: false, pauseUntil: Date.now() + 800, eatUntil: 0, happyUntil: 0,
    });
    // Refresh inventory
    const inv = await fetch('/api/pet-items').then(r => r.json());
    if (Array.isArray(inv)) setInventory(inv);
    setAddingPet(false);
    setPetPanelTab('mine');
  };

  const releasePet = async (id: string) => {
    if (!confirm('정말 이 펫을 보내주실 건가요?')) return;
    await fetch(`/api/pets?id=${id}`, { method: 'DELETE' });
    const filtered = petsRef.current.filter(p => p.id !== id);
    petsRef.current = filtered;
    setPets(filtered);
    petWalkRef.current.delete(id);
    setFeedingPetId(null);
  };

  const feedPet = async (petId: string, item_type: string) => {
    const res = await fetch('/api/pet-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pet_id: petId, item_type }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }

    // Update pet stats & inventory
    setPets(prev => prev.map(p => p.id === petId ? { ...p, ...data.pet } : p));
    setInventory(prev => prev.map(i => i.item_type === item_type ? { ...i, quantity: data.item_qty } : i));

    // Trigger eat → happy animation on canvas
    const ws = petWalkRef.current.get(petId);
    if (ws) {
      ws.eatUntil   = Date.now() + 1400;
      ws.happyUntil = Date.now() + 3200;
    }

    // Floating food emoji effect on canvas
    const pet = petsRef.current.find(p => p.id === petId);
    const itemEmoji = PET_ITEM_MAP[item_type]?.emoji ?? '🍎';
    const heartEmoji = data.pet?.happiness > 80 ? '💖' : '✨';
    if (pet) {
      const efId = ++feedEffectId.current;
      setFeedEffects(prev => [
        ...prev,
        { id: efId,     emoji: itemEmoji, x: pet.pos_x,       y: pet.pos_y - 8 },
        { id: efId + 1, emoji: heartEmoji, x: pet.pos_x + 4,  y: pet.pos_y - 14 },
      ]);
      setTimeout(() => {
        setFeedEffects(prev => prev.filter(e => e.id !== efId && e.id !== efId + 1));
      }, 1600);
    }

    // Close item picker after feeding
    setFeedingPetId(null);
  };

  const categoryKeys = Object.keys(CATEGORY_LABELS) as AssetCategory[];

  if (loading) {
    return (
      <div className="w-full bg-gradient-to-b from-amber-50 to-amber-100 rounded-2xl flex items-center justify-center" style={{ aspectRatio: '16/7' }}>
        <div className="text-amber-400 text-sm animate-pulse">✨ 스페이스 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 select-none">
      {/* Owner toolbar */}
      {isOwner && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Room Editor</span>
          <div className="flex gap-1">
            <ToolBtn active={mode==='view'}  onClick={() => setMode('view')}  label="👁️ 보기" />
            <ToolBtn active={mode==='place'} onClick={() => setMode('place')} label="🪑 가구" />
            <ToolBtn active={mode==='pet'}   onClick={() => setMode('pet')}   label={`🐾 펫 (${pets.length})`} />
          </div>
          {mode === 'place' && <span className="text-xs text-gray-400 ml-auto">드래그 배치 · 클릭 선택 → 크기/삭제</span>}
        </div>
      )}

      {/* Furniture picker */}
      {isOwner && mode === 'place' && (
        <div className="bg-white border border-amber-200 rounded-2xl p-3 shadow-sm">
          <div className="flex gap-1 mb-2 flex-wrap">
            {categoryKeys.map(cat => (
              <button key={cat} onClick={() => setSelCategory(cat)}
                className={`px-2 py-0.5 rounded-full text-xs font-bold transition ${selCategory===cat ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-500 hover:bg-amber-50'}`}>
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {ASSETS.filter(a => a.category === selCategory).map(asset => (
              <button key={asset.id} onPointerDown={e => onAssetPointerDown(e, asset.id)}
                className="flex flex-col items-center gap-0.5 p-2 rounded-xl border border-gray-100 hover:border-amber-300 hover:bg-amber-50 transition group cursor-grab"
                style={{ touchAction:'none', userSelect:'none' }}>
                <span style={{ fontSize:30 }}>{asset.emoji}</span>
                <span className="text-[10px] text-gray-400 group-hover:text-amber-600">{asset.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pet panel */}
      {isOwner && mode === 'pet' && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-3 shadow-sm">
          {/* Sub-tabs */}
          <div className="flex gap-1 mb-3">
            <button onClick={() => setPetPanelTab('mine')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${petPanelTab==='mine' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-emerald-50'}`}>
              🐾 내 펫 ({pets.length}/4)
            </button>
            <button onClick={() => setPetPanelTab('add')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${petPanelTab==='add' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-emerald-50'}`}>
              ➕ 펫 입양
            </button>
            <div className="ml-auto text-xs text-gray-400 flex items-center gap-1">
              {PET_ITEMS.map(item => {
                const qty = inventory.find(i => i.item_type === item.id)?.quantity ?? 0;
                return <span key={item.id} className={qty > 0 ? 'text-gray-700' : 'text-gray-300'}>{item.emoji}×{qty}</span>;
              })}
            </div>
          </div>

          {/* 내 펫 */}
          {petPanelTab === 'mine' && (
            pets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">아직 펫이 없어요. "펫 입양" 탭에서 첫 펫을 데려오세요 🐾</p>
            ) : (
              <div className="flex gap-3 flex-wrap">
                {pets.map(pet => {
                  const stage = getGrowthStage(pet.exp);
                  const expNext = GROWTH_STAGES.find(s => s.minExp > pet.exp)?.minExp ?? pet.exp + 1;
                  const expPct = stage.id === 'special' ? 100 : Math.round(((pet.exp - stage.minExp) / (expNext - stage.minExp)) * 100);
                  const petDef = PET_TYPES.find(p => p.id === pet.pet_type);
                  return (
                    <div key={pet.id} className="border border-emerald-100 rounded-xl p-2.5 w-48 bg-emerald-50/50">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-lg">{petDef?.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-gray-700 leading-none">{pet.name}</p>
                          <p className="text-[10px] text-gray-400">Lv.{pet.level} · {stage.label}</p>
                        </div>
                      </div>
                      {/* Stats bars */}
                      <StatBar emoji="🍎" value={pet.hunger}    color="bg-orange-400" />
                      <StatBar emoji="😊" value={pet.happiness} color="bg-yellow-400" />
                      <div className="mt-1">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                          <span>✨ EXP</span><span>{pet.exp}/{expNext}</span>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-400 rounded-full transition-all" style={{ width: `${expPct}%` }} />
                        </div>
                      </div>
                      {/* Feed button */}
                      <div className="mt-2 flex gap-1">
                        <button onClick={() => setFeedingPetId(feedingPetId === pet.id ? null : pet.id)}
                          className="flex-1 text-[11px] font-bold py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition">
                          🍎 먹이주기
                        </button>
                        {/* Hide / Show toggle */}
                        <button
                          onClick={() => setHiddenPetIds(prev => {
                            const next = new Set(prev);
                            if (next.has(pet.id)) next.delete(pet.id); else next.add(pet.id);
                            return next;
                          })}
                          title={hiddenPetIds.has(pet.id) ? '방에 표시하기' : '방에서 숨기기'}
                          className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition font-medium ${
                            hiddenPetIds.has(pet.id)
                              ? 'bg-gray-200 text-gray-500 hover:bg-emerald-100 hover:text-emerald-600'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}>
                          {hiddenPetIds.has(pet.id)
                            ? <><EyeOff size={12}/><span>숨김</span></>
                            : <><Eye size={12}/><span>표시</span></>}
                        </button>
                        {/* Release / Delete */}
                        <button
                          onClick={() => releasePet(pet.id)}
                          title="펫 보내주기"
                          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-400 transition font-medium">
                          <Trash2 size={12}/><span>삭제</span>
                        </button>
                      </div>
                      {/* Item picker (expanded) */}
                      {feedingPetId === pet.id && (
                        <div className="mt-2 flex gap-1 flex-wrap">
                          {PET_ITEMS.map(item => {
                            const qty = inventory.find(i => i.item_type === item.id)?.quantity ?? 0;
                            return (
                              <button key={item.id}
                                disabled={qty === 0}
                                onClick={() => feedPet(pet.id, item.id)}
                                className={`flex flex-col items-center p-1.5 rounded-lg border text-[10px] transition ${qty > 0 ? 'border-emerald-200 hover:bg-emerald-100 cursor-pointer' : 'border-gray-100 opacity-40 cursor-not-allowed'}`}>
                                <span className="text-base">{item.emoji}</span>
                                <span className="text-gray-500">×{qty}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* 펫 입양 */}
          {petPanelTab === 'add' && (
            <div>
              {pets.length >= 4 && !isAdmin && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">펫 슬롯이 가득 찼습니다. 기존 펫을 보내줘야 새 펫을 입양할 수 있어요.</p>
              )}
              <div className="flex gap-2 flex-wrap">
                {PET_TYPES.map(pt => {
                  const locked = !isAdmin && totalPosts < pt.unlockAt;
                  const slotFull = !isAdmin && pets.length >= 4;
                  const disabled = addingPet || slotFull || locked;
                  return (
                    <button key={pt.id}
                      disabled={disabled}
                      onClick={() => !locked && !slotFull && adoptPet(pt.id)}
                      className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border transition
                        ${locked ? 'cursor-not-allowed border-gray-200 bg-gray-50'
                          : slotFull ? 'opacity-40 cursor-not-allowed border-gray-100'
                          : 'border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 cursor-pointer'}`}>
                      {/* Always show sprite */}
                      <div className="relative">
                        <PetSprite type={pt.id} anim="idle" size={40} growthScale={1}/>
                        {locked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded">
                            <span className="text-base">🔒</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-bold text-gray-600">{pt.label}</span>
                      {locked && (
                        <span className="text-[9px] text-gray-400">{pt.unlockAt}개 필요</span>
                      )}
                      {isAdmin && pt.unlockAt > 0 && (
                        <span className="text-[8px] text-purple-400">관리자</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                💡 현재 게시글 {totalPosts}개 · 앱/프롬프트를 더 등록하면 희귀 펫이 해금됩니다!
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Room Canvas ── */}
      <div
        ref={roomRef}
        className="relative w-full overflow-hidden rounded-2xl border-2 border-white shadow-xl"
        style={{ aspectRatio: '16/7', cursor: draggingId ? 'grabbing' : (assetGhost ? 'copy' : 'default') }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Background */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${theme.wall} 0%, ${theme.wall} 55%, ${theme.floor} 55%)` }} />
        <div className="absolute left-0 right-0" style={{ top:'53%', height:6, background:theme.skirting, opacity:0.6 }} />
        {[60,68,76,84,92].map(y => (
          <div key={y} className="absolute left-0 right-0" style={{ top:`${y}%`, height:1, background:'rgba(0,0,0,0.06)' }} />
        ))}
        {/* Window */}
        <div className="absolute" style={{ top:'8%', left:'60%', width:'22%', height:'28%' }}>
          <div className="w-full h-full rounded-lg border-4 bg-gradient-to-b from-sky-200 to-sky-100 opacity-70" style={{ borderColor:theme.skirting }}>
            <div className="absolute inset-0 flex items-center justify-center opacity-50">☁️</div>
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-current opacity-30" />
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-current opacity-30" />
          </div>
        </div>

        {/* Furniture items */}
        {[...items]
          .sort((a,b) => a.z_idx !== b.z_idx ? a.z_idx - b.z_idx : a.pos_y - b.pos_y)
          .map(item => {
            const asset = ASSET_MAP[item.asset_id];
            if (!asset) return null;
            const fontSize = 32 * item.item_scale;
            const isSel = selectedId === item.id && isOwner;
            return (
              <div key={item.id} style={{ position:'absolute', left:`${item.pos_x}%`, top:`${item.pos_y}%`, transform:'translate(-50%,-50%)', zIndex: item.z_idx*10+Math.floor(item.pos_y), touchAction:'none', userSelect:'none' }}
                onPointerDown={e => onItemPointerDown(e, item.id, item.pos_x, item.pos_y)}>
                <div style={{ fontSize, lineHeight:1, filter:`drop-shadow(0 2px 4px rgba(0,0,0,0.2))${isSel?' drop-shadow(0 0 6px rgba(251,191,36,0.8))':''}`, cursor:isOwner?(draggingId===item.id?'grabbing':'grab'):'default', transform:`scaleX(${item.flip_x?-1:1})`, transition:draggingId===item.id?'none':'filter 0.2s', outline:isSel?'2px dashed #fbbf24':'none', borderRadius:4 }}>
                  {asset.emoji}
                </div>
                {isSel && (
                  <div style={{ position:'absolute', bottom:'100%', left:'50%', transform:'translateX(-50%)', display:'flex', gap:3, background:'rgba(0,0,0,0.75)', borderRadius:8, padding:'3px 5px', marginBottom:4, zIndex:999, whiteSpace:'nowrap' }}
                    onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
                    <button onClick={e=>{e.stopPropagation();changeScale(item.id,-0.2);}} style={{color:'white',fontSize:12,padding:'1px 5px',borderRadius:4,background:'rgba(255,255,255,0.15)',cursor:'pointer',lineHeight:1.4}}>－</button>
                    <span style={{color:'#fbbf24',fontSize:10,lineHeight:'18px',minWidth:28,textAlign:'center'}}>{Math.round(item.item_scale*10)/10}×</span>
                    <button onClick={e=>{e.stopPropagation();changeScale(item.id,0.2);}} style={{color:'white',fontSize:12,padding:'1px 5px',borderRadius:4,background:'rgba(255,255,255,0.15)',cursor:'pointer',lineHeight:1.4}}>＋</button>
                    <div style={{width:1,background:'rgba(255,255,255,0.2)',margin:'2px 1px'}} />
                    <button onClick={e=>{e.stopPropagation();deleteItem(item.id);setSelectedId(null);}} style={{color:'#f87171',fontSize:12,padding:'1px 5px',borderRadius:4,background:'rgba(255,255,255,0.15)',cursor:'pointer',lineHeight:1.4}}>🗑</button>
                  </div>
                )}
              </div>
            );
          })}

        {/* Pets */}
        {pets.filter(p => !hiddenPetIds.has(p.id)).map(pet => {
          const stage = getGrowthStage(pet.exp);
          return (
            <div key={pet.id} style={{
              position:'absolute', left:`${pet.pos_x}%`, top:`${pet.pos_y}%`,
              transform:`translate(-50%,-50%) scaleX(${pet.flip?-1:1})`,
              zIndex: 200 + Math.floor(pet.pos_y),
              filter:'drop-shadow(0 3px 6px rgba(0,0,0,0.22))',
              cursor: isOwner ? 'pointer' : 'default',
              touchAction:'none',
            }}
              onClick={() => isOwner && setMode('pet')}
            >
              <PetSprite type={pet.pet_type} anim={pet.anim} size={140} growthScale={stage.scale} />
            </div>
          );
        })}

        {/* 먹이 플로팅 이펙트 */}
        {feedEffects.map(ef => (
          <div key={ef.id} style={{
            position: 'absolute',
            left: `${ef.x}%`, top: `${ef.y}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: 22,
            zIndex: 999,
            pointerEvents: 'none',
            animation: 'feedFloat 1.6s ease-out forwards',
          }}>
            {ef.emoji}
          </div>
        ))}

        {/* Labels */}
        <div className="absolute top-3 left-3 z-50">
          <span className="text-[10px] font-black text-white bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">MY STUDIO</span>
        </div>

        {pets.length === 0 && !isOwner && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50">
            <span className="text-[10px] text-white bg-black/25 backdrop-blur-sm px-3 py-1 rounded-full">아직 펫이 없어요 🐾</span>
          </div>
        )}

        {/* Drop zone highlight */}
        {assetGhost && (
          <div className="absolute inset-0 border-4 border-dashed border-amber-400/60 rounded-2xl pointer-events-none z-50 bg-amber-100/10" />
        )}

        {isOwner && mode === 'view' && (
          <div className="absolute bottom-3 right-3 z-50">
            <span className="text-[10px] text-white bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">✏️ 위의 버튼으로 꾸미기</span>
          </div>
        )}
      </div>

      {/* Ghost emoji during drag */}
      {assetGhost && (
        <div style={{ position:'fixed', left:assetGhost.x, top:assetGhost.y, transform:'translate(-50%,-50%)', fontSize:40, pointerEvents:'none', zIndex:9999, opacity:0.85, filter:'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
          {ASSET_MAP[assetGhost.assetId]?.emoji}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────
function ToolBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${active ? 'bg-amber-400 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-amber-50'}`}>
      {label}
    </button>
  );
}

function StatBar({ emoji, value, color }: { emoji: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className="text-[11px]">{emoji}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width:`${value}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 w-6 text-right">{value}</span>
    </div>
  );
}
