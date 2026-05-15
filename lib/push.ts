import webpush from 'web-push';
import { getAdminClient } from '@/lib/database';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
) {
  const admin = getAdminClient();
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subs?.length) return;

  const message = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? '/my?tab=purchases' });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, message),
    ),
  );

  const expired = results
    .map((r, i) => ({ r, endpoint: subs[i].endpoint }))
    .filter(({ r }) => r.status === 'rejected' && [410, 404].includes((r.reason as { statusCode?: number })?.statusCode ?? 0))
    .map(({ endpoint }) => endpoint);

  if (expired.length) {
    await admin.from('push_subscriptions').delete().in('endpoint', expired);
  }
}
