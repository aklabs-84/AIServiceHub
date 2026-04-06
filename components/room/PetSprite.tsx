'use client';

export type PetAnim = 'idle' | 'walk' | 'eat' | 'happy' | 'sleep' | 'curious' | 'sad';

interface PetSpriteProps {
  type: string;
  anim?: PetAnim;
  size?: number;
  growthScale?: number;
}

type C = { body: string; belly: string; dark: string; ear: string; eye: string };

const COLORS: Record<string, C> = {
  cat:     { body: '#e8923a', belly: '#fde8c8', dark: '#b86010', ear: '#ffb3c1', eye: '#2d8a4e' },
  dog:     { body: '#d4a040', belly: '#fdf0d8', dark: '#7a4800', ear: '#b07830', eye: '#2a1000' },
  rabbit:  { body: '#c8c8cc', belly: '#f4f4f8', dark: '#909098', ear: '#ffb3c1', eye: '#4090e0' },
  fox:     { body: '#d4541a', belly: '#f8f0e4', dark: '#922a00', ear: '#e86040', eye: '#c07820' },
  panda:   { body: '#f5f5f5', belly: '#f5f5f5', dark: '#1a1a1a', ear: '#1a1a1a', eye: '#111' },
  unicorn: { body: '#f0e8f8', belly: '#ffe8f8', dark: '#c0a0d8', ear: '#e8b0d8', eye: '#6060d0' },
  dragon:  { body: '#3a8a3a', belly: '#9ad860', dark: '#1a5a1a', ear: '#1a5a1a', eye: '#d4a020' },
  // AI 특별 펫
  pixel:   { body: '#ff80c0', belly: '#ffe4f8', dark: '#c040a0', ear: '#ffd700', eye: '#6040ff' },
  vibe:    { body: '#c8e8f8', belly: '#ffffff',  dark: '#6090c0', ear: '#d0e8f8', eye: '#4878d0' },
  byte:    { body: '#2a7a2a', belly: '#80e860',  dark: '#0a4a0a', ear: '#00ff80', eye: '#00e060' },
  prompy:  { body: '#8878f0', belly: '#e0d8ff',  dark: '#4840a0', ear: '#c0b8ff', eye: '#ffffff' },
  claudy:  { body: '#7040c8', belly: '#d8c8ff',  dark: '#3820a0', ear: '#c080ff', eye: '#40e8ff' },
};

interface A { c: C; sleep: boolean; happy: boolean; eat: boolean; sad: boolean }

// ── Shared eyes ──────────────────────────────────────────────────────────────
function Eyes({ c, type, sleep, happy, sad, x1, x2, ey }: {
  c: C; type?: string; sleep: boolean; happy: boolean; sad: boolean; x1: number; x2: number; ey: number;
}) {
  if (sleep) return (
    <g>
      <path d={`M${x1-7} ${ey} Q${x1} ${ey+7} ${x1+7} ${ey}`} stroke={c.dark} strokeWidth="2.8" fill="none" strokeLinecap="round"/>
      <path d={`M${x2-7} ${ey} Q${x2} ${ey+7} ${x2+7} ${ey}`} stroke={c.dark} strokeWidth="2.8" fill="none" strokeLinecap="round"/>
      <text x={x2+10} y={ey-8}  fontSize="8"  fill="#8090b0" opacity="0.6">z</text>
      <text x={x2+16} y={ey-17} fontSize="11" fill="#8090b0" opacity="0.5">z</text>
    </g>
  );
  if (sad) return (
    <g>
      {/* Teary downturned eyes */}
      <circle cx={x1} cy={ey} r="9"   fill="white"/>
      <circle cx={x2} cy={ey} r="9"   fill="white"/>
      <circle cx={x1} cy={ey+2} r="6" fill={c.eye}/>
      <circle cx={x2} cy={ey+2} r="6" fill={c.eye}/>
      <circle cx={x1} cy={ey+2} r="3.5" fill="#111"/>
      <circle cx={x2} cy={ey+2} r="3.5" fill="#111"/>
      {/* Angled inner brow shadow → sad look */}
      <path d={`M${x1-8} ${ey-6} Q${x1} ${ey-2} ${x1+8} ${ey-6}`} stroke={c.dark} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
      <path d={`M${x2-8} ${ey-6} Q${x2} ${ey-2} ${x2+8} ${ey-6}`} stroke={c.dark} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
      {/* Tear drops */}
      <ellipse cx={x1+2} cy={ey+14} rx="2.2" ry="3.5" fill="#88c0ff" opacity="0.75"/>
      <ellipse cx={x2+2} cy={ey+14} rx="2.2" ry="3.5" fill="#88c0ff" opacity="0.75"/>
    </g>
  );
  if (happy) return (
    <g>
      <path d={`M${x1-8} ${ey+4} Q${x1} ${ey-8} ${x1+8} ${ey+4}`} stroke={c.eye} strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d={`M${x2-8} ${ey+4} Q${x2} ${ey-8} ${x2+8} ${ey+4}`} stroke={c.eye} strokeWidth="4" fill="none" strokeLinecap="round"/>
    </g>
  );
  return (
    <g>
      <circle cx={x1} cy={ey} r="9"   fill="white"/>
      <circle cx={x2} cy={ey} r="9"   fill="white"/>
      <circle cx={x1} cy={ey+1} r="6.2" fill={c.eye}/>
      <circle cx={x2} cy={ey+1} r="6.2" fill={c.eye}/>
      <circle cx={x1+1} cy={ey}   r="3.8" fill="#111"/>
      <circle cx={x2+1} cy={ey}   r="3.8" fill="#111"/>
      {/* Big sparkle highlight */}
      <circle cx={x1-3} cy={ey-3} r="3"   fill="white" opacity="0.95"/>
      <circle cx={x2-3} cy={ey-3} r="3"   fill="white" opacity="0.95"/>
      <circle cx={x1+4} cy={ey+4} r="1.3" fill="white" opacity="0.55"/>
      <circle cx={x2+4} cy={ey+4} r="1.3" fill="white" opacity="0.55"/>
    </g>
  );
}

// ── CAT ──────────────────────────────────────────────────────────────────────
function CatSVG({ c, sleep, happy, eat, sad }: A) {
  return (
    <>
      {/* Far pair legs (behind body, dark) */}
      <g className="pet-leg-b"><rect x="83" y="71" width="10" height="19" rx="5" fill={c.dark}/></g>
      <g className="pet-leg-a"><rect x="49" y="71" width="10" height="18" rx="5" fill={c.dark}/></g>

      {/* Tail — curves up from back */}
      <g className="pet-tail">
        <path d="M 97 62 Q 117 40 111 21" stroke={c.body} strokeWidth="9" fill="none" strokeLinecap="round"/>
        <path d="M 97 62 Q 117 40 111 21" stroke={c.dark} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="4 7" opacity="0.35"/>
      </g>

      {/* Pointed ears */}
      <polygon points="19,23 12,4 30,16" fill={c.body}/>
      <polygon points="63,23 70,4 52,16" fill={c.body}/>
      <polygon points="20,22 15,8 28,17" fill={c.ear}/>
      <polygon points="62,22 67,8 53,17" fill={c.ear}/>

      {/* Body */}
      <ellipse cx="72" cy="64" rx="31" ry="17" fill={c.body}/>
      {/* Tabby back stripes */}
      <path d="M 65 50 Q 74 45 82 50" stroke={c.dark} strokeWidth="2.2" fill="none" opacity="0.3"/>
      <path d="M 68 56 Q 76 51 84 55" stroke={c.dark} strokeWidth="1.5" fill="none" opacity="0.2"/>
      {/* Belly */}
      <ellipse cx="68" cy="68" rx="21" ry="12" fill={c.belly}/>

      {/* Near pair legs (in front of body, lighter) */}
      <g className="pet-leg-b"><rect x="55" y="71" width="10" height="18" rx="5" fill={c.body}/></g>
      <g className="pet-leg-a"><rect x="89" y="71" width="10" height="19" rx="5" fill={c.body}/></g>

      {/* Neck + big round head */}
      <ellipse cx="49" cy="57" rx="14" ry="12" fill={c.body}/>
      <circle cx="41" cy="37" r="25" fill={c.body}/>

      {/* Forehead tabby stripes */}
      <path d="M 35 21 Q 41 15 47 21" stroke={c.dark} strokeWidth="2"   fill="none" opacity="0.3"/>
      <path d="M 33 26 Q 41 20 49 26" stroke={c.dark} strokeWidth="1.5" fill="none" opacity="0.2"/>

      {/* Rosy cheeks */}
      <circle cx="21" cy="44" r="9" fill="#ffb3c1" opacity="0.4"/>
      <circle cx="61" cy="44" r="9" fill="#ffb3c1" opacity="0.4"/>

      {/* Whiskers */}
      {!sleep && (
        <>
          <line x1="10" y1="43" x2="28" y2="46" stroke="white" strokeWidth="1.3" opacity="0.7"/>
          <line x1="10" y1="48" x2="28" y2="49" stroke="white" strokeWidth="1.3" opacity="0.7"/>
          <line x1="54" y1="46" x2="72" y2="43" stroke="white" strokeWidth="1.3" opacity="0.7"/>
          <line x1="54" y1="49" x2="72" y2="48" stroke="white" strokeWidth="1.3" opacity="0.7"/>
        </>
      )}

      <Eyes c={c} type="\1" sleep={sleep} happy={happy} sad={sad} x1={30} x2={52} ey={37}/>

      {/* Eyebrows */}
      {!sleep && !happy && (
        <>
          <path d="M 22 27 Q 31 22 38 26" stroke={c.dark} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.65"/>
          <path d="M 44 26 Q 51 22 60 27" stroke={c.dark} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.65"/>
        </>
      )}

      {/* Nose */}
      {!sleep && <ellipse cx="41" cy="48" rx="4" ry="3" fill={c.dark}/>}

      {/* Mouth */}
      {eat
        ? <ellipse cx="41" cy="55" rx="7" ry="6" fill="#7a2a00" opacity="0.7"/>
        : !sleep && <path d={sad ? "M 37 55 Q 41 49 45 55" : "M 37 51 Q 41 57 45 51"} stroke={c.dark} strokeWidth="1.8" fill="none" strokeLinecap="round"/>}

      {eat && (
        <>
          <circle cx="15" cy="28" r="4" fill="#ff6b35" opacity="0.7"/>
          <circle cx="10" cy="19" r="3" fill="#ffd700" opacity="0.65"/>
        </>
      )}
    </>
  );
}

// ── DOG ──────────────────────────────────────────────────────────────────────
function DogSVG({ c, sleep, happy, eat, sad }: A) {
  return (
    <>
      {/* Far legs */}
      <g className="pet-leg-b"><rect x="84" y="72" width="11" height="18" rx="5.5" fill="#c8a070"/></g>
      <g className="pet-leg-a"><rect x="50" y="72" width="11" height="17" rx="5.5" fill="#c8a070"/></g>

      {/* Tail */}
      <g className="pet-tail">
        <path d="M 103 57 Q 124 44 120 28" stroke={c.body} strokeWidth="9" fill="none" strokeLinecap="round"/>
      </g>

      {/* Floppy ears */}
      <ellipse cx="19" cy="32" rx="12" ry="19" fill={c.ear} transform="rotate(-18 19 32)"/>
      <ellipse cx="64" cy="32" rx="12" ry="19" fill={c.ear} transform="rotate(18 64 32)"/>

      {/* Body — white base with brown saddle */}
      <ellipse cx="72" cy="63" rx="31" ry="16" fill="white"/>
      <ellipse cx="78" cy="54" rx="22" ry="12" fill={c.dark} opacity="0.6"/>
      <ellipse cx="68" cy="68" rx="22" ry="12" fill={c.belly}/>

      {/* Near legs */}
      <g className="pet-leg-b"><rect x="56" y="72" width="11" height="17" rx="5.5" fill="white"/></g>
      <g className="pet-leg-a"><rect x="90" y="72" width="11" height="18" rx="5.5" fill="white"/></g>

      {/* Neck + head */}
      <ellipse cx="48" cy="56" rx="14" ry="12" fill="white"/>
      {/* Brown head patch */}
      <ellipse cx="44" cy="48" rx="16" ry="12" fill={c.dark} opacity="0.55"/>
      <circle cx="41" cy="37" r="25" fill="white"/>
      {/* Top-of-head brown */}
      <ellipse cx="41" cy="25" rx="20" ry="14" fill={c.dark} opacity="0.5"/>

      {/* Cheeks */}
      <circle cx="21" cy="44" r="8" fill="#ffb3c1" opacity="0.42"/>
      <circle cx="61" cy="44" r="8" fill="#ffb3c1" opacity="0.42"/>

      <Eyes c={c} type="\1" sleep={sleep} happy={happy} sad={sad} x1={30} x2={52} ey={37}/>

      {/* Big black puppy nose */}
      {!sleep && (
        <>
          <ellipse cx="41" cy="50" rx="5.5" ry="4" fill="#111"/>
          <circle cx="39" cy="49" r="1.5" fill="white" opacity="0.55"/>
          <circle cx="43" cy="49" r="1.5" fill="white" opacity="0.55"/>
        </>
      )}

      {eat
        ? <ellipse cx="41" cy="57" rx="7" ry="6" fill="#5a2000" opacity="0.7"/>
        : !sleep && <path d={sad ? "M 36 53 Q 41 47 46 53" : "M 36 53 Q 41 59 46 53"} stroke="#111" strokeWidth="1.8" fill="none" strokeLinecap="round"/>}

      {eat && (
        <>
          <circle cx="15" cy="28" r="4" fill="#ff8c00" opacity="0.7"/>
          <circle cx="10" cy="19" r="3" fill="#ffd700" opacity="0.65"/>
        </>
      )}
    </>
  );
}

// ── RABBIT ───────────────────────────────────────────────────────────────────
function RabbitSVG({ c, sleep, happy, eat, sad }: A) {
  return (
    <>
      {/* Far legs */}
      <g className="pet-leg-b"><rect x="83" y="72" width="10" height="18" rx="5" fill={c.dark}/></g>
      <g className="pet-leg-a"><rect x="49" y="72" width="10" height="17" rx="5" fill={c.dark}/></g>

      {/* Fluffy tail */}
      <g className="pet-tail">
        <circle cx="103" cy="60" r="10" fill="white"/>
        <circle cx="103" cy="60" r="8"  fill={c.body}/>
        <circle cx="103" cy="60" r="5"  fill="white" opacity="0.6"/>
      </g>

      {/* Long ears */}
      <ellipse cx="27" cy="6" rx="9" ry="23" fill={c.body}/>
      <ellipse cx="55" cy="6" rx="9" ry="23" fill={c.body}/>
      <ellipse cx="27" cy="6" rx="5" ry="18" fill={c.ear}/>
      <ellipse cx="55" cy="6" rx="5" ry="18" fill={c.ear}/>

      {/* Body */}
      <ellipse cx="72" cy="63" rx="29" ry="15" fill={c.body}/>
      <ellipse cx="68" cy="68" rx="20" ry="11" fill={c.belly}/>

      {/* Near legs */}
      <g className="pet-leg-b"><rect x="55" y="72" width="10" height="17" rx="5" fill={c.body}/></g>
      <g className="pet-leg-a"><rect x="89" y="72" width="10" height="18" rx="5" fill={c.body}/></g>

      {/* Neck + head */}
      <ellipse cx="49" cy="57" rx="13" ry="11" fill={c.body}/>
      <circle cx="41" cy="37" r="24" fill={c.body}/>

      {/* Cheeks */}
      <circle cx="22" cy="45" r="8" fill="#ffb3c1" opacity="0.4"/>
      <circle cx="60" cy="45" r="8" fill="#ffb3c1" opacity="0.4"/>

      <Eyes c={c} type="\1" sleep={sleep} happy={happy} sad={sad} x1={30} x2={52} ey={37}/>

      {/* Pink nose */}
      {!sleep && <ellipse cx="41" cy="49" rx="3.5" ry="2.5" fill={c.ear}/>}

      {eat
        ? <ellipse cx="41" cy="56" rx="6" ry="5" fill="#7a2a00" opacity="0.7"/>
        : !sleep && <path d={sad ? "M 37 52 Q 41 46 45 52" : "M 37 52 Q 41 57 45 52"} stroke={c.dark} strokeWidth="1.8" fill="none" strokeLinecap="round"/>}
    </>
  );
}

// ── FOX ──────────────────────────────────────────────────────────────────────
function FoxSVG({ c, sleep, happy, eat, sad }: A) {
  return (
    <>
      {/* Far legs */}
      <g className="pet-leg-b"><rect x="85" y="72" width="10" height="19" rx="5" fill={c.dark}/></g>
      <g className="pet-leg-a"><rect x="50" y="72" width="10" height="18" rx="5" fill={c.dark}/></g>

      {/* Bushy tail */}
      <g className="pet-tail">
        <path d="M 100 60 Q 126 50 128 30 Q 123 16 111 26 Q 119 40 100 60" fill={c.body}/>
        <circle cx="116" cy="23" r="10" fill="white"/>
        {/* Tail tip detail */}
        <circle cx="116" cy="23" r="7" fill="white" opacity="0.8"/>
      </g>

      {/* Big pointed ears */}
      <polygon points="19,21 10,2 31,14" fill={c.body}/>
      <polygon points="63,21 72,2 51,14" fill={c.body}/>
      <polygon points="20,20 13,6 29,15" fill={c.ear}/>
      <polygon points="62,20 69,6 53,15" fill={c.ear}/>

      {/* Body — orange with white belly */}
      <ellipse cx="72" cy="63" rx="31" ry="16" fill={c.body}/>
      <ellipse cx="65" cy="68" rx="20" ry="11" fill={c.belly}/>

      {/* Near legs */}
      <g className="pet-leg-b"><rect x="56" y="72" width="10" height="18" rx="5" fill={c.body}/></g>
      <g className="pet-leg-a"><rect x="91" y="72" width="10" height="19" rx="5" fill={c.body}/></g>

      {/* White muzzle connects neck to face */}
      <ellipse cx="49" cy="57" rx="14" ry="12" fill={c.body}/>
      <circle cx="41" cy="37" r="25" fill={c.body}/>
      {/* White muzzle area */}
      <ellipse cx="41" cy="49" rx="16" ry="13" fill={c.belly}/>

      {/* Cheeks */}
      <circle cx="21" cy="42" r="8" fill="#ffb3c1" opacity="0.38"/>
      <circle cx="61" cy="42" r="8" fill="#ffb3c1" opacity="0.38"/>

      <Eyes c={c} type="\1" sleep={sleep} happy={happy} sad={sad} x1={30} x2={52} ey={34}/>

      {/* Fox eyebrows — give it character */}
      {!sleep && !happy && (
        <>
          <path d="M 22 25 Q 31 20 38 24" stroke={c.dark} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.7"/>
          <path d="M 44 24 Q 51 20 60 25" stroke={c.dark} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.7"/>
        </>
      )}

      {!sleep && <ellipse cx="41" cy="47" rx="4" ry="3" fill={c.dark}/>}

      {eat
        ? <ellipse cx="41" cy="54" rx="7" ry="6" fill="#7a2a00" opacity="0.7"/>
        : !sleep && <path d={sad ? "M 37 50 Q 41 44 45 50" : "M 37 50 Q 41 55 45 50"} stroke={c.dark} strokeWidth="1.8" fill="none" strokeLinecap="round"/>}

      {eat && (
        <>
          <circle cx="15" cy="28" r="4" fill="#ff6b35" opacity="0.7"/>
          <circle cx="10" cy="19" r="3" fill="#ffd700" opacity="0.65"/>
        </>
      )}
    </>
  );
}

// ── PANDA ─────────────────────────────────────────────────────────────────────
function PandaSVG({ c, sleep, happy, eat, sad }: A) {
  return (
    <>
      {/* Far legs — black */}
      <g className="pet-leg-b"><rect x="83" y="72" width="12" height="18" rx="6" fill="#1a1a1a"/></g>
      <g className="pet-leg-a"><rect x="48" y="72" width="12" height="17" rx="6" fill="#1a1a1a"/></g>

      {/* Stub tail */}
      <g className="pet-tail">
        <circle cx="104" cy="60" r="7" fill="white"/>
      </g>

      {/* Round ears — black */}
      <circle cx="20" cy="16" r="14" fill="#1a1a1a"/>
      <circle cx="62" cy="16" r="14" fill="#1a1a1a"/>

      {/* Body — white with black dorsal */}
      <ellipse cx="72" cy="63" rx="32" ry="18" fill="white"/>
      <ellipse cx="80" cy="53" rx="22" ry="14" fill="#1a1a1a" opacity="0.82"/>
      <ellipse cx="68" cy="68" rx="23" ry="13" fill="white"/>

      {/* Near legs — black */}
      <g className="pet-leg-b"><rect x="55" y="72" width="12" height="17" rx="6" fill="#1a1a1a"/></g>
      <g className="pet-leg-a"><rect x="89" y="72" width="12" height="18" rx="6" fill="#1a1a1a"/></g>

      {/* Neck + head */}
      <ellipse cx="49" cy="56" rx="14" ry="13" fill="white"/>
      <circle cx="41" cy="37" r="26" fill="white"/>

      {/* Black eye patches */}
      <ellipse cx="29" cy="38" rx="14" ry="13" fill="#1a1a1a" opacity="0.78"/>
      <ellipse cx="53" cy="38" rx="14" ry="13" fill="#1a1a1a" opacity="0.78"/>

      {/* Panda eyes */}
      {sleep ? (
        <>
          <path d="M 22 38 Q 29 45 36 38" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M 46 38 Q 53 45 60 38" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        </>
      ) : happy ? (
        <>
          <path d="M 22 42 Q 29 30 36 42" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          <path d="M 46 42 Q 53 30 60 42" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <circle cx="29" cy="38" r="8.5" fill="white"/>
          <circle cx="53" cy="38" r="8.5" fill="white"/>
          <circle cx="29" cy="39" r="6"   fill="#1a1a1a"/>
          <circle cx="53" cy="39" r="6"   fill="#1a1a1a"/>
          <circle cx="27" cy="36" r="2.8" fill="white" opacity="0.9"/>
          <circle cx="51" cy="36" r="2.8" fill="white" opacity="0.9"/>
        </>
      )}

      {/* Big black nose */}
      {!sleep && (
        <>
          <ellipse cx="41" cy="49" rx="5" ry="3.5" fill="#1a1a1a"/>
          <circle cx="39" cy="48" r="1.5" fill="white" opacity="0.5"/>
          <circle cx="43" cy="48" r="1.5" fill="white" opacity="0.5"/>
        </>
      )}

      {eat
        ? <ellipse cx="41" cy="56" rx="7" ry="6" fill="#111" opacity="0.8"/>
        : !sleep && <path d={sad ? "M 36 53 Q 41 47 46 53" : "M 36 53 Q 41 58 46 53"} stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>}
    </>
  );
}

// ── UNICORN (horse body) ──────────────────────────────────────────────────────
function UnicornSVG({ c, sleep, happy, eat, sad }: A) {
  return (
    <>
      {/* Far legs — longer horse legs */}
      <g className="pet-leg-b"><rect x="87" y="71" width="10" height="20" rx="5" fill={c.dark}/></g>
      <g className="pet-leg-a"><rect x="54" y="71" width="10" height="19" rx="5" fill={c.dark}/></g>

      {/* Rainbow tail */}
      <g className="pet-tail">
        <path d="M 106 58 Q 128 40 122 20" stroke="#ff80c0" strokeWidth="7"   fill="none" strokeLinecap="round"/>
        <path d="M 108 60 Q 132 46 126 24" stroke="#80c0ff" strokeWidth="5"   fill="none" strokeLinecap="round"/>
        <path d="M 110 62 Q 128 54 124 36" stroke="#ffd700" strokeWidth="3"   fill="none" strokeLinecap="round"/>
      </g>

      {/* Pointed unicorn ears */}
      <polygon points="25,24 18,6 34,17" fill={c.body}/>
      <polygon points="58,24 65,6 48,17" fill={c.body}/>
      <polygon points="26,23 21,10 32,18" fill={c.ear}/>
      <polygon points="57,23 62,10 50,18" fill={c.ear}/>

      {/* Horn */}
      <polygon points="40,1 35,22 45,22" fill="#ffd700"/>
      <polygon points="40,1 35,22 40,20" fill="#e8a800"/>

      {/* Mane */}
      <path d="M 36,19 Q 54,33 52,52" stroke="#ff80c0" strokeWidth="6" fill="none" strokeLinecap="round"/>
      <path d="M 43,17 Q 62,31 59,50" stroke="#80c0ff" strokeWidth="4" fill="none" strokeLinecap="round"/>

      {/* HORSE body — wider/longer than cat */}
      <ellipse cx="80" cy="63" rx="38" ry="19" fill={c.body}/>
      <ellipse cx="74" cy="68" rx="28" ry="14" fill={c.belly}/>

      {/* Near legs */}
      <g className="pet-leg-b"><rect x="61" y="71" width="10" height="19" rx="5" fill={c.body}/></g>
      <g className="pet-leg-a"><rect x="94" y="71" width="10" height="20" rx="5" fill={c.body}/></g>

      {/* Long horse neck */}
      <ellipse cx="49" cy="54" rx="14" ry="17" fill={c.body}/>
      <ellipse cx="43" cy="43" rx="13" ry="14" fill={c.body}/>

      {/* Horse head — slightly oval, front-facing */}
      <ellipse cx="38" cy="34" rx="22" ry="24" fill={c.body}/>
      {/* Horse muzzle */}
      <ellipse cx="38" cy="53" rx="14" ry="11" fill={c.belly}/>

      {/* Cheeks */}
      <circle cx="20" cy="41" r="9" fill="#ffb3c1" opacity="0.38"/>
      <circle cx="56" cy="41" r="9" fill="#ffb3c1" opacity="0.38"/>

      <Eyes c={c} type="\1" sleep={sleep} happy={happy} sad={sad} x1={27} x2={49} ey={32}/>

      {/* Nostrils */}
      {!sleep && (
        <>
          <circle cx="33" cy="55" r="2.5" fill={c.dark} opacity="0.55"/>
          <circle cx="43" cy="55" r="2.5" fill={c.dark} opacity="0.55"/>
        </>
      )}

      {eat
        ? <ellipse cx="38" cy="61" rx="7" ry="6" fill="#7a3090" opacity="0.65"/>
        : !sleep && <path d={sad ? "M 33 58 Q 38 52 43 58" : "M 33 58 Q 38 64 43 58"} stroke={c.dark} strokeWidth="1.8" fill="none" strokeLinecap="round"/>}

      {/* Magic sparkles */}
      {happy && (
        <>
          <circle cx="5"  cy="22" r="3.5" fill="#ffd700" opacity="0.8"/>
          <circle cx="72" cy="14" r="2.5" fill="#ff80c0" opacity="0.8"/>
          <circle cx="68" cy="5"  r="1.8" fill="#80c0ff" opacity="0.7"/>
        </>
      )}
    </>
  );
}

// ── DRAGON ───────────────────────────────────────────────────────────────────
function DragonSVG({ c, sleep, happy, eat, sad }: A) {
  return (
    <>
      {/* Far legs */}
      <g className="pet-leg-b"><rect x="85" y="71" width="12" height="19" rx="6" fill={c.dark}/></g>
      <g className="pet-leg-a"><rect x="50" y="71" width="12" height="18" rx="6" fill={c.dark}/></g>

      {/* Tail */}
      <g className="pet-tail">
        <path d="M 105 57 Q 130 44 126 23" stroke={c.body} strokeWidth="11" fill="none" strokeLinecap="round"/>
        <polygon points="126,23 118,14 132,16" fill={c.dark}/>
      </g>

      {/* Horns */}
      <polygon points="22,19 15,2 30,13" fill={c.dark}/>
      <polygon points="61,19 68,2 53,13" fill={c.dark}/>

      {/* Dragon body — large */}
      <ellipse cx="75" cy="63" rx="36" ry="19" fill={c.body}/>
      {/* Back spines */}
      <polygon points="58,50 61,36 64,50" fill={c.dark}/>
      <polygon points="69,48 72,33 75,48" fill={c.dark}/>
      <polygon points="80,48 83,33 86,48" fill={c.dark}/>
      {/* Belly */}
      <ellipse cx="71" cy="68" rx="25" ry="14" fill={c.belly}/>
      {/* Wing hint */}
      <path d="M 77 52 Q 100 36 104 44" stroke={c.dark} strokeWidth="3" fill="none" strokeLinecap="round"/>

      {/* Near legs */}
      <g className="pet-leg-b"><rect x="57" y="71" width="12" height="18" rx="6" fill={c.body}/></g>
      <g className="pet-leg-a"><rect x="92" y="71" width="12" height="19" rx="6" fill={c.body}/></g>

      {/* Neck + head */}
      <ellipse cx="48" cy="55" rx="15" ry="14" fill={c.body}/>
      <circle cx="41" cy="36" r="26" fill={c.body}/>
      {/* Forehead scale accent */}
      <ellipse cx="41" cy="29" rx="17" ry="9" fill={c.dark} opacity="0.18"/>

      {/* Cheeks */}
      <circle cx="20" cy="43" r="8" fill="#ffb3c1" opacity="0.25"/>
      <circle cx="62" cy="43" r="8" fill="#ffb3c1" opacity="0.25"/>

      <Eyes c={c} type="\1" sleep={sleep} happy={happy} sad={sad} x1={29} x2={53} ey={35}/>

      {/* Dragon nostrils */}
      {!sleep && (
        <>
          <ellipse cx="36" cy="49" rx="3.5" ry="2.5" fill={c.dark}/>
          <ellipse cx="46" cy="49" rx="3.5" ry="2.5" fill={c.dark}/>
        </>
      )}

      {eat
        ? (
          <>
            <ellipse cx="41" cy="56" rx="8" ry="7" fill="#c44000" opacity="0.75"/>
            <circle cx="15" cy="28" r="5" fill="#ff6b00" opacity="0.7"/>
            <circle cx="9"  cy="18" r="3.5" fill="#ffd700" opacity="0.65"/>
          </>
        )
        : !sleep && <path d={sad ? "M 35 53 Q 41 47 47 53" : "M 35 53 Q 41 59 47 53"} stroke={c.dark} strokeWidth="2" fill="none" strokeLinecap="round"/>}

      {happy && (
        <>
          <circle cx="6"  cy="26" r="4.5" fill="#ff6b00" opacity="0.7"/>
          <circle cx="4"  cy="15" r="3"   fill="#ffd700" opacity="0.65"/>
        </>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AI 특별 펫 — 두발 보행(Pixel·Byte·Claudy) + 공중 부유(Vibe·Prompy)
// ══════════════════════════════════════════════════════════════════════════════

// ── PIXEL (🌈 픽셀 요정 — 두 발 보행) ────────────────────────────────────────
// 작은 픽셀 아트 고블린 스타일. 네모난 몸, 레인보우 줄무늬, 두 발로 걸어다님.
function PixelSVG({ c, sleep, happy, eat, sad }: A) {
  const RB = ['#ff4040','#ff9000','#ffd700','#40c840','#4080ff','#9040e0'];
  return (
    <>
      {/* Far leg (back — darker) */}
      <g className="pet-leg-b">
        <rect x="34" y="66" width="13" height="18" rx="4" fill={c.dark}/>
        <rect x="30" y="80" width="17" height="7" rx="3" fill={c.dark}/>
      </g>

      {/* Torso */}
      <rect x="20" y="44" width="52" height="26" rx="8" fill={c.body}/>
      {RB.map((col, i) => (
        <rect key={i} x={22 + i * 8} y={46} width="7" height="22" rx="3" fill={col} opacity="0.45"/>
      ))}
      <rect x="20" y="44" width="52" height="26" rx="8" fill="white" opacity="0.1"/>

      {/* Head */}
      <rect x="12" y="8" width="56" height="44" rx="10" fill={c.body}/>
      {RB.map((col, i) => (
        <circle key={i} cx={22 + i * 8} cy={22} r="6" fill={col} opacity="0.5"/>
      ))}
      <rect x="12" y="8" width="56" height="44" rx="10" fill="white" opacity="0.08"/>

      {/* Antennae */}
      <line x1="28" y1="8" x2="22" y2="-3" stroke={c.ear} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="21" cy="-4" r="5" fill={c.ear}/>
      <circle cx="21" cy="-4" r="2.5" fill="white" opacity="0.9"/>
      <line x1="52" y1="8" x2="58" y2="-3" stroke="#ff4040" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="59" cy="-4" r="5" fill="#ff4040"/>
      <circle cx="59" cy="-4" r="2.5" fill="white" opacity="0.9"/>

      {/* Cheeks */}
      <circle cx="16" cy="40" r="8" fill="#ffb3c1" opacity="0.45"/>
      <circle cx="64" cy="40" r="8" fill="#ffb3c1" opacity="0.45"/>

      {/* Eyes — pixel art rect style */}
      {sleep ? (
        <>
          <path d="M 22 32 Q 30 40 38 32" stroke={c.dark} strokeWidth="3" fill="none" strokeLinecap="round"/>
          <path d="M 42 32 Q 50 40 58 32" stroke={c.dark} strokeWidth="3" fill="none" strokeLinecap="round"/>
        </>
      ) : happy ? (
        <>
          <path d="M 22 36 Q 30 24 38 36" stroke={c.eye} strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d="M 42 36 Q 50 24 58 36" stroke={c.eye} strokeWidth="4" fill="none" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <rect x="20" y="26" width="18" height="14" rx="4" fill="white"/>
          <rect x="42" y="26" width="18" height="14" rx="4" fill="white"/>
          <rect x="23" y="28" width="11" height="10" rx="3" fill={c.eye}/>
          <rect x="45" y="28" width="11" height="10" rx="3" fill={c.eye}/>
          <rect x="24" y="29" width="5" height="5" rx="1" fill="#111"/>
          <rect x="46" y="29" width="5" height="5" rx="1" fill="#111"/>
          <circle cx="24" cy="29" r="2" fill="white" opacity="0.9"/>
          <circle cx="46" cy="29" r="2" fill="white" opacity="0.9"/>
        </>
      )}

      {!sleep && <rect x="36" y="43" width="8" height="6" rx="2" fill={c.dark}/>}
      {eat
        ? <rect x="31" y="48" width="18" height="12" rx="6" fill="#7a2a00" opacity="0.7"/>
        : !sleep && <path d="M 33 48 Q 40 55 47 48" stroke={c.dark} strokeWidth="2" fill="none" strokeLinecap="round"/>}

      {/* Near leg (front — lighter) */}
      <g className="pet-leg-a">
        <rect x="50" y="66" width="13" height="18" rx="4" fill={c.body}/>
        <rect x="48" y="80" width="17" height="7" rx="3" fill={c.body}/>
      </g>

      {happy && RB.map((col, i) => (
        <circle key={i} cx={8 + i * 18} cy={6 + (i % 2) * 9} r="4.5" fill={col} opacity="0.8"/>
      ))}
    </>
  );
}

// ── VIBE (☁️ 로파이 구름 — 공중 부유) ────────────────────────────────────────
// 다리 없음. CSS float 애니메이션으로 둥실둥실 떠다님. 헤비 아이리드 졸린 눈.
function VibeSVG({ c, sleep, happy, eat, sad }: A) {
  return (
    <>
      {/* Shadow below (subtle, shows it's floating) */}
      <ellipse cx="60" cy="84" rx="30" ry="5" fill="#4090c0" opacity="0.12"/>

      {/* Trailing cloud wisps */}
      <circle cx="100" cy="58" r="10" fill={c.body} opacity="0.5"/>
      <circle cx="112" cy="52" r="7"  fill={c.body} opacity="0.3"/>
      <circle cx="120" cy="47" r="5"  fill={c.body} opacity="0.2"/>

      {/* Main cloud body — overlapping puffs */}
      <circle cx="88" cy="54" r="18" fill={c.body}/>
      <circle cx="70" cy="48" r="24" fill={c.body}/>
      <circle cx="50" cy="56" r="20" fill={c.body}/>
      <ellipse cx="70" cy="68" rx="38" ry="13" fill={c.body}/>

      {/* Highlights */}
      <circle cx="58" cy="41" r="11" fill="white" opacity="0.5"/>
      <circle cx="76" cy="44" r="7"  fill="white" opacity="0.35"/>
      <circle cx="88" cy="48" r="5"  fill="white" opacity="0.25"/>

      {/* Music notes floating */}
      {!sleep && <text x="96" y="38" fontSize="11" fill={c.dark} opacity="0.5">♫</text>}
      {happy    && <text x="10" y="30" fontSize="13" fill={c.dark} opacity="0.65">♪</text>}

      {/* Cloud head bumps */}
      <circle cx="24" cy="36" r="18" fill={c.body}/>
      <circle cx="40" cy="24" r="22" fill={c.body}/>
      <circle cx="58" cy="30" r="18" fill={c.body}/>
      <circle cx="44" cy="40" r="22" fill={c.body}/>
      <circle cx="34" cy="22" r="11" fill="white" opacity="0.45"/>

      {/* Cheeks */}
      <circle cx="20" cy="47" r="8" fill="#ffb3c1" opacity="0.4"/>
      <circle cx="66" cy="47" r="8" fill="#ffb3c1" opacity="0.4"/>

      {/* Eyes — always a bit droopy (lo-fi aesthetic) */}
      {sleep ? (
        <>
          <path d="M 24 38 Q 32 46 40 38" stroke={c.dark} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M 48 38 Q 56 46 64 38" stroke={c.dark} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <text x="68" y="29" fontSize="9" fill={c.dark} opacity="0.55">z</text>
          <text x="74" y="20" fontSize="12" fill={c.dark} opacity="0.45">z</text>
        </>
      ) : happy ? (
        <>
          <path d="M 24 42 Q 32 30 40 42" stroke={c.eye} strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d="M 48 42 Q 56 30 64 42" stroke={c.eye} strokeWidth="4" fill="none" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <circle cx="32" cy="38" r="9"   fill="white"/>
          <circle cx="56" cy="38" r="9"   fill="white"/>
          <circle cx="32" cy="39" r="6.5" fill={c.eye}/>
          <circle cx="56" cy="39" r="6.5" fill={c.eye}/>
          <circle cx="33" cy="38" r="4"   fill="#111"/>
          <circle cx="57" cy="38" r="4"   fill="#111"/>
          {/* Heavy eyelid */}
          <rect x="23" y="29" width="18" height="9" rx="4" fill={c.body} opacity="0.6"/>
          <rect x="47" y="29" width="18" height="9" rx="4" fill={c.body} opacity="0.6"/>
          <circle cx="29" cy="35" r="2.5" fill="white" opacity="0.9"/>
          <circle cx="53" cy="35" r="2.5" fill="white" opacity="0.9"/>
        </>
      )}

      {!sleep && <ellipse cx="44" cy="51" rx="3.5" ry="2.5" fill={c.dark} opacity="0.55"/>}
      {eat
        ? <ellipse cx="44" cy="57" rx="7" ry="6" fill={c.dark} opacity="0.6"/>
        : !sleep && <path d="M 40 53 Q 44 59 48 53" stroke={c.dark} strokeWidth="1.8" fill="none" strokeLinecap="round"/>}
    </>
  );
}

// ── BYTE (🐛 코드 버그 로봇 — 두 발 보행) ────────────────────────────────────
// 컴팩트한 달걀형 바디의 귀여운 소형 로봇. 회로 패턴, 두 발로 뒤뚱뒤뚱.
function ByteSVG({ c, sleep, happy, eat, sad }: A) {
  return (
    <>
      {/* Far leg */}
      <g className="pet-leg-b">
        <rect x="38" y="68" width="11" height="16" rx="5" fill={c.dark}/>
        <rect x="34" y="80" width="16" height="7" rx="3" fill={c.dark}/>
      </g>

      {/* Egg-shaped body */}
      <ellipse cx="55" cy="58" rx="28" ry="20" fill={c.body}/>
      {/* Circuit lines on body */}
      <path d="M 36 54 L 44 54 L 48 50 L 56 50 L 60 54 L 68 54 L 72 50"
        stroke={c.belly} strokeWidth="1.8" fill="none" opacity="0.7"/>
      <path d="M 38 62 L 46 62 L 50 58 L 60 58 L 64 62 L 72 62"
        stroke={c.belly} strokeWidth="1.5" fill="none" opacity="0.5"/>
      <circle cx="36" cy="54" r="2.5" fill={c.belly}/>
      <circle cx="56" cy="50" r="2.5" fill={c.belly}/>
      <circle cx="74" cy="54" r="2.5" fill={c.belly}/>
      {/* Belly panel */}
      <ellipse cx="52" cy="62" rx="18" ry="11" fill={c.belly}/>

      {/* Near leg */}
      <g className="pet-leg-a">
        <rect x="54" y="68" width="11" height="16" rx="5" fill={c.body}/>
        <rect x="52" y="80" width="16" height="7" rx="3" fill={c.body}/>
      </g>

      {/* Neck connector */}
      <rect x="32" y="42" width="16" height="16" rx="6" fill={c.body}/>

      {/* Head — compact rounded square */}
      <rect x="10" y="8" width="50" height="42" rx="12" fill={c.body}/>
      {/* Circuit on head */}
      <path d="M 20 22 L 28 22 L 32 18 L 38 18 L 42 22 L 50 22"
        stroke={c.belly} strokeWidth="1.4" fill="none" opacity="0.45"/>

      {/* Glowing antennae */}
      <line x1="24" y1="8" x2="18" y2="-2" stroke={c.dark} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="17" cy="-3" r="4.5" fill={c.belly}/>
      <circle cx="17" cy="-3" r="2.2" fill="white" opacity="0.9"/>
      <line x1="46" y1="8" x2="52" y2="-2" stroke={c.dark} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="53" cy="-3" r="4.5" fill={c.belly}/>
      <circle cx="53" cy="-3" r="2.2" fill="white" opacity="0.9"/>

      {/* Cheeks */}
      <circle cx="14" cy="40" r="7" fill="#ffb3c1" opacity="0.35"/>
      <circle cx="56" cy="40" r="7" fill="#ffb3c1" opacity="0.35"/>

      <Eyes c={c} type="\1" sleep={sleep} happy={happy} sad={sad} x1={25} x2={45} ey={30}/>

      {!sleep && <ellipse cx="35" cy="42" rx="4" ry="3" fill={c.dark}/>}
      {eat
        ? <ellipse cx="35" cy="48" rx="7" ry="6" fill="#1a4a1a" opacity="0.75"/>
        : !sleep && <path d="M 30 45 Q 35 51 40 45" stroke={c.dark} strokeWidth="1.8" fill="none" strokeLinecap="round"/>}

      {happy && (
        <>
          <text x="2"  y="18" fontSize="9" fill={c.belly} fontFamily="monospace">&lt;/&gt;</text>
          <text x="62" y="14" fontSize="9" fill={c.belly} fontFamily="monospace">✓</text>
        </>
      )}
    </>
  );
}

// ── PROMPY (💬 말풍선 유령 — 공중 부유) ──────────────────────────────────────
// 다리 없음. 말풍선 모양의 유령. 살랑살랑 공중을 떠다님.
function PrompySVG({ c, sleep, happy, eat, sad }: A) {
  return (
    <>
      {/* Shadow below */}
      <ellipse cx="60" cy="84" rx="25" ry="4" fill="#6040b0" opacity="0.12"/>

      {/* Ghost trailing wisps at bottom */}
      <ellipse cx="46" cy="76" rx="10" ry="8" fill={c.body}/>
      <ellipse cx="62" cy="79" rx="9"  ry="7" fill={c.body}/>
      <ellipse cx="78" cy="76" rx="10" ry="8" fill={c.body}/>

      {/* Indents between wisps */}
      <ellipse cx="54" cy="81" rx="6"  ry="5" fill="white" opacity="0.4"/>
      <ellipse cx="70" cy="81" rx="6"  ry="5" fill="white" opacity="0.4"/>

      {/* Main ghost body */}
      <rect x="28" y="34" width="68" height="44" rx="16" fill={c.body}/>
      {/* Bubble speech pointer */}
      <polygon points="36,77 26,88 48,77" fill={c.body}/>

      {/* Body text / typing indicator */}
      {!sleep && !eat && (
        <text x="42" y="62" fontSize="10" fill={c.belly} fontFamily="monospace" fontWeight="bold" opacity="0.95">
          {happy ? '✨AI✨' : '· · ·'}
        </text>
      )}
      {eat && (
        <text x="46" y="62" fontSize="10" fill={c.belly} fontFamily="monospace" opacity="0.95">nom!</text>
      )}

      {/* Floating code tag above */}
      {!sleep && (
        <text x="22" y="22" fontSize="9" fill={c.dark} fontFamily="monospace" opacity="0.7">&lt;/&gt;</text>
      )}

      {/* Neck/connector to head */}
      <ellipse cx="44" cy="34" rx="16" ry="10" fill={c.body}/>

      {/* Big round head */}
      <circle cx="38" cy="22" r="26" fill={c.body}/>
      {/* Inner panel hint */}
      <rect x="18" y="8" width="40" height="28" rx="8" fill={c.dark} opacity="0.08"/>

      {/* Cheeks */}
      <circle cx="16" cy="30" r="8" fill="#ffb3c1" opacity="0.4"/>
      <circle cx="60" cy="30" r="8" fill="#ffb3c1" opacity="0.4"/>

      {/* Eyes — inverted (white iris on dark sclera = ghost look) */}
      {sleep ? (
        <>
          <path d="M 22 22 Q 30 30 38 22" stroke={c.dark} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M 42 22 Q 50 30 58 22" stroke={c.dark} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <text x="62" y="14" fontSize="9" fill={c.dark} opacity="0.6">z</text>
          <text x="68" y="5"  fontSize="12" fill={c.dark} opacity="0.5">z</text>
        </>
      ) : happy ? (
        <>
          <path d="M 22 26 Q 30 14 38 26" stroke={c.eye} strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d="M 42 26 Q 50 14 58 26" stroke={c.eye} strokeWidth="4" fill="none" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <circle cx="30" cy="22" r="9"   fill={c.belly}/>
          <circle cx="50" cy="22" r="9"   fill={c.belly}/>
          <circle cx="30" cy="23" r="6.5" fill={c.dark}/>
          <circle cx="50" cy="23" r="6.5" fill={c.dark}/>
          <circle cx="31" cy="22" r="3.8" fill={c.eye}/>
          <circle cx="51" cy="22" r="3.8" fill={c.eye}/>
          <circle cx="27" cy="19" r="2.5" fill="white" opacity="0.9"/>
          <circle cx="47" cy="19" r="2.5" fill="white" opacity="0.9"/>
        </>
      )}

      {!sleep && <ellipse cx="40" cy="35" rx="4" ry="3" fill={c.dark} opacity="0.7"/>}

      {happy && (
        <>
          <circle cx="6"  cy="10" r="3.5" fill={c.belly} opacity="0.8"/>
          <circle cx="72" cy="6"  r="3"   fill={c.belly} opacity="0.8"/>
          <circle cx="68" cy="-2" r="2"   fill={c.belly} opacity="0.6"/>
        </>
      )}
    </>
  );
}

// ── CLAUDY (🤖 AI 로봇 — 두 발 보행) ────────────────────────────────────────
// 우아한 두 발 보행 로봇. 화면 얼굴에 감정 표현. 긴 다리로 성큼성큼.
function ClaudySVG({ c, sleep, happy, eat, sad }: A) {
  return (
    <>
      {/* Far leg — mechanical joint */}
      <g className="pet-leg-b">
        <rect x="36" y="58" width="13" height="22" rx="6" fill={c.dark}/>
        <rect x="33" y="74" width="18" height="8"  rx="4" fill={c.dark}/>
      </g>

      {/* Body chassis */}
      <rect x="18" y="38" width="60" height="28" rx="12" fill={c.body}/>
      {/* Chest screen */}
      <rect x="28" y="44" width="40" height="16" rx="6" fill={c.dark} opacity="0.45"/>
      {!sleep && (
        <text x="33" y="56" fontSize="9" fontFamily="monospace" fill={c.eye} opacity="0.9">
          {happy ? '✨ AI' : eat ? 'NOM!' : 'AI •'}
        </text>
      )}
      {/* Status LEDs */}
      <circle cx="21" cy="46" r="3" fill={happy ? '#40ff80' : '#ff4040'} opacity="0.85"/>
      <circle cx="21" cy="56" r="3" fill={c.eye} opacity="0.75"/>

      {/* Near leg */}
      <g className="pet-leg-a">
        <rect x="54" y="58" width="13" height="22" rx="6" fill={c.body}/>
        <rect x="52" y="74" width="18" height="8"  rx="4" fill={c.body}/>
      </g>

      {/* Neck joint */}
      <rect x="28" y="30" width="22" height="14" rx="6" fill={c.body}/>

      {/* Head — rounded rect */}
      <rect x="6" y="2" width="62" height="38" rx="14" fill={c.body}/>
      {/* Head top panel accent */}
      <rect x="6" y="2" width="62" height="14" rx="14" fill={c.dark} opacity="0.28"/>
      {/* Head antenna */}
      <line x1="37" y1="2" x2="32" y2="-9" stroke={c.dark} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="31" cy="-10" r="5.5" fill={c.ear}/>
      <circle cx="31" cy="-10" r="3"   fill={c.eye}/>

      {/* Screen face */}
      <rect x="12" y="18" width="50" height="18" rx="7" fill="#060618"/>
      <rect x="12" y="18" width="50" height="18" rx="7" fill={c.eye} opacity="0.06"/>

      {sleep ? (
        <text x="17" y="31" fontSize="11" fontFamily="monospace" fill={c.eye} opacity="0.7">- . -</text>
      ) : happy ? (
        <text x="16" y="32" fontSize="14" fontFamily="monospace" fill={c.eye}>^‿^</text>
      ) : eat ? (
        <text x="19" y="32" fontSize="13" fontFamily="monospace" fill={c.eye}>^ω^</text>
      ) : (
        <>
          <rect x="18" y="23" width="14" height="9"  rx="4" fill={c.eye}/>
          <rect x="42" y="23" width="14" height="9"  rx="4" fill={c.eye}/>
          <rect x="20" y="24" width="8"  height="6"  rx="2" fill="white" opacity="0.4"/>
          <rect x="44" y="24" width="8"  height="6"  rx="2" fill="white" opacity="0.4"/>
        </>
      )}

      {/* Side cheeks — LED blush */}
      <circle cx="9"  cy="28" r="5" fill="#ff80c0" opacity="0.38"/>
      <circle cx="65" cy="28" r="5" fill="#ff80c0" opacity="0.38"/>

      {/* Tail wire */}
      <path d="M 76 44 Q 94 36 92 20" stroke={c.dark} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <circle cx="92" cy="19" r="5"  fill={c.ear}/>
      <circle cx="92" cy="19" r="3"  fill={c.eye}/>

      {happy && (
        <>
          <circle cx="0"  cy="12" r="4"   fill={c.eye} opacity="0.75"/>
          <circle cx="-2" cy="2"  r="2.5" fill={c.ear} opacity="0.65"/>
          <circle cx="80" cy="8"  r="3.5" fill={c.eye} opacity="0.7"/>
        </>
      )}
    </>
  );
}

// ── Map type → component ─────────────────────────────────────────────────────
const PET_MAP: Record<string, React.ComponentType<A>> = {
  cat: CatSVG, dog: DogSVG, rabbit: RabbitSVG,
  fox: FoxSVG, panda: PandaSVG, unicorn: UnicornSVG, dragon: DragonSVG,
  pixel: PixelSVG, vibe: VibeSVG, byte: ByteSVG, prompy: PrompySVG, claudy: ClaudySVG,
};

// ── Floating pet types (no leg animation, use float CSS) ─────────────────────
const FLOAT_PETS = new Set(['vibe', 'prompy']);

// ── Main export ───────────────────────────────────────────────────────────────
export default function PetSprite({ type, anim = 'idle', size = 80, growthScale = 1 }: PetSpriteProps) {
  const c = COLORS[type] ?? COLORS.cat;
  const sleep = anim === 'sleep';
  const happy = anim === 'happy';
  const eat   = anim === 'eat';

  const sad = anim === 'sad';

  const isFloat = FLOAT_PETS.has(type);
  const ac = isFloat
    ? ({
        idle:    'animate-pet-float',
        walk:    'animate-pet-float-drift',
        eat:     'animate-pet-float',
        happy:   'animate-pet-happy',
        sleep:   'animate-pet-sleep',
        sad:     'animate-pet-sad',
        curious: 'animate-pet-float',
      } as Record<string, string>)[anim] ?? 'animate-pet-float'
    : ({
        idle:    'animate-pet-idle',
        walk:    'animate-pet-walk',
        eat:     'animate-pet-eat',
        happy:   'animate-pet-happy',
        sleep:   'animate-pet-sleep',
        sad:     'animate-pet-sad',
        curious: 'animate-pet-curious',
      } as Record<string, string>)[anim] ?? 'animate-pet-idle';

  const isLarge = type === 'unicorn' || type === 'dragon';
  const w = size * growthScale * (isLarge ? 1.18 : 1);
  const h = w * (90 / 130);

  const Body = PET_MAP[type] ?? CatSVG;

  return (
    <div className={ac} style={{ width: w, height: h }}>
      <svg viewBox="0 0 130 90" width={w} height={h} xmlns="http://www.w3.org/2000/svg" overflow="visible">
        <Body c={c} sleep={sleep} happy={happy} eat={eat} sad={sad}/>
      </svg>
    </div>
  );
}
