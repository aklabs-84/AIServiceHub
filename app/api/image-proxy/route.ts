import { NextRequest } from 'next/server';

const ALLOWED_HOSTS = new Set([
  'drive.google.com',
  'lh3.googleusercontent.com',
  'googleusercontent.com',
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) {
    return new Response('Missing url', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response('Invalid url', { status: 400 });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return new Response('Unsupported protocol', { status: 400 });
  }

  const hostname = parsed.hostname.toLowerCase();
  const allowed = [...ALLOWED_HOSTS].some(
    (host) => hostname === host || hostname.endsWith(`.${host}`)
  );

  if (!allowed) {
    return new Response('Host not allowed', { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      redirect: 'follow',
      headers: {
        accept: 'image/*,*/*;q=0.8',
      },
    });
  } catch {
    return new Response('Failed to fetch image', { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response('Image fetch failed', { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg';
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
