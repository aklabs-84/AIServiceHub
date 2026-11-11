// 입장권(문지기) 발급 — 서버 전용. 비밀키는 환경변수 GATE_PRIVATE_KEY_JWK 에만 둔다(앱·브라우저에는 절대 내려보내지 않음).
// 형식: base64url(payloadJSON).base64url(Ed25519 서명). 앱의 middleware.js 가 같은 규칙으로 확인한다.
const TICKET_TTL_SEC = 5 * 60; // 앱 쪽 상한(15분)보다 짧게

let cachedKey: Promise<CryptoKey> | null = null;

function getPrivateKey(): Promise<CryptoKey> {
  const raw = process.env.GATE_PRIVATE_KEY_JWK;
  if (!raw) throw new Error('GATE_PRIVATE_KEY_JWK not set');
  if (!cachedKey) {
    cachedKey = crypto.subtle.importKey('jwk', JSON.parse(raw), 'Ed25519', false, ['sign']);
    cachedKey.catch(() => { cachedKey = null; });
  }
  return cachedKey;
}

export function isGateConfigured(): boolean {
  return Boolean(process.env.GATE_PRIVATE_KEY_JWK);
}

export async function signGateTicket(appId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ v: 1, app: appId, iat: now, exp: now + TICKET_TTL_SEC, iss: 'hub' }),
  ).toString('base64url');
  const sig = await crypto.subtle.sign('Ed25519', await getPrivateKey(), new TextEncoder().encode(payload));
  return `${payload}.${Buffer.from(sig).toString('base64url')}`;
}
