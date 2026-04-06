'use client';

import { SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS } from './ASSETS';

interface CharacterSpriteProps {
  skin: string;
  hair: string;
  outfit: string;
  anim: string;
  size?: number;
}

const skinColor = (id: string) => SKIN_TONES.find(s => s.id === id)?.color ?? '#ffd5b5';
const hairColor = (id: string) => HAIR_COLORS.find(h => h.id === id)?.color ?? '#1a1a1a';
const outfitColor = (id: string) => OUTFIT_COLORS.find(o => o.id === id)?.color ?? '#4c8bf5';

export default function CharacterSprite({ skin, hair, outfit, anim, size = 80 }: CharacterSpriteProps) {
  const sc = skinColor(skin);
  const hc = hairColor(hair);
  const oc = outfitColor(outfit);
  const dark = darken(oc);
  const skinDark = darken(sc);

  const isWalking = anim === 'walk';

  const animClass = {
    idle:  'animate-character-idle',
    walk:  'animate-character-walk',
    wave:  'animate-character-wave',
    sit:   'animate-character-sit',
    dance: 'animate-character-dance',
    sleep: 'animate-character-sleep',
    think: 'animate-character-think',
  }[anim] ?? 'animate-character-idle';

  return (
    <div className={`inline-block select-none ${animClass}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 80" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        {/* Shadow */}
        <ellipse cx="24" cy="78" rx="10" ry="3" fill="rgba(0,0,0,0.15)" />

        {/* Legs */}
        <rect x="14" y="52" width="8" height="16" rx="4" fill={oc} className={isWalking ? 'walk-left-leg' : ''} />
        <rect x="26" y="52" width="8" height="16" rx="4" fill={oc} className={isWalking ? 'walk-right-leg' : ''} />
        {/* Shoes */}
        <rect x="12" y="64" width="11" height="6" rx="3" fill={dark} />
        <rect x="25" y="64" width="11" height="6" rx="3" fill={dark} />

        {/* Body */}
        <rect x="12" y="32" width="24" height="22" rx="6" fill={oc} />
        {/* Collar / shirt detail */}
        <rect x="19" y="32" width="10" height="6" rx="3" fill={lighten(oc)} />

        {/* Left arm */}
        <rect x="4" y="33" width="9" height="6" rx="3" fill={oc}
          className={isWalking ? 'walk-left-arm' : (anim === 'wave' ? 'animate-arm-wave' : '')}
          style={!isWalking ? { transformOrigin: '12px 36px' } : undefined} />
        {/* Right arm */}
        <rect x="35" y="33" width="9" height="6" rx="3" fill={oc}
          className={isWalking ? 'walk-right-arm' : ''} />

        {/* Left hand */}
        <circle cx="7" cy="40" r="3.5" fill={sc} />
        {/* Right hand */}
        <circle cx="41" cy="36" r="3.5" fill={sc} />

        {/* Neck */}
        <rect x="20" y="27" width="8" height="6" rx="2" fill={sc} />

        {/* Head */}
        <ellipse cx="24" cy="20" rx="13" ry="14" fill={sc} />

        {/* Hair (back) */}
        <ellipse cx="24" cy="10" rx="13" ry="9" fill={hc} />

        {/* Ears */}
        <circle cx="11" cy="20" r="3.5" fill={sc} />
        <circle cx="37" cy="20" r="3.5" fill={sc} />
        <circle cx="11" cy="20" r="2" fill={skinDark} />
        <circle cx="37" cy="20" r="2" fill={skinDark} />

        {/* Hair (front) */}
        <path d={`M11 14 Q24 4 37 14 Q37 8 24 6 Q11 8 11 14`} fill={hc} />

        {/* Eyes */}
        {anim === 'sleep' ? (
          <>
            <path d="M16 20 Q19 22 22 20" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M26 20 Q29 22 32 20" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="19" cy="20" rx="3" ry="3.5" fill="white" />
            <ellipse cx="29" cy="20" rx="3" ry="3.5" fill="white" />
            <circle cx="20" cy="20.5" r="1.8" fill="#1a1a1a" />
            <circle cx="30" cy="20.5" r="1.8" fill="#1a1a1a" />
            <circle cx="20.7" cy="19.5" r="0.7" fill="white" />
            <circle cx="30.7" cy="19.5" r="0.7" fill="white" />
          </>
        )}

        {/* Nose */}
        <circle cx="24" cy="24" r="1.2" fill={skinDark} />

        {/* Mouth */}
        {anim === 'sleep' || anim === 'think' ? (
          <path d="M20 28 Q24 27 28 28" stroke={skinDark} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        ) : anim === 'dance' ? (
          <path d="M19 27 Q24 31 29 27" stroke={skinDark} strokeWidth="1.2" fill={lighten(sc)} strokeLinecap="round" />
        ) : (
          <path d="M19 28 Q24 32 29 28" stroke={skinDark} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        )}

        {/* Think bubble */}
        {anim === 'think' && (
          <>
            <circle cx="35" cy="12" r="1.5" fill="white" stroke="#ccc" strokeWidth="0.5" />
            <circle cx="39" cy="8" r="2.5" fill="white" stroke="#ccc" strokeWidth="0.5" />
            <circle cx="44" cy="4" r="4" fill="white" stroke="#ccc" strokeWidth="0.5" />
            <text x="43" y="6" fontSize="4" textAnchor="middle" fill="#888">?</text>
          </>
        )}

        {/* Sleep zzz */}
        {anim === 'sleep' && (
          <>
            <text x="36" y="10" fontSize="5" fill="#8899aa" fontWeight="bold">z</text>
            <text x="40" y="5" fontSize="7" fill="#8899aa" fontWeight="bold">z</text>
          </>
        )}

        {/* Wave hand raised */}
        {anim === 'wave' && (
          <text x="0" y="38" fontSize="10">👋</text>
        )}
      </svg>
    </div>
  );
}

function darken(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 40)})`;
}

function lighten(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, r + 60)},${Math.min(255, g + 60)},${Math.min(255, b + 60)})`;
}
