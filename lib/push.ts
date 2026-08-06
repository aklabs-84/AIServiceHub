import webpush from 'web-push';
import { getAdminClient } from '@/lib/database';

const ADMIN_EMAIL = 'mosebb@gmail.com';

export type PushSendResult = {
  subscriptionCount: number;
  sent: number;
  failed: { endpoint: string; statusCode?: number; message: string }[];
};

export async function sendAdminPush(payload: { title: string; body: string; url?: string }): Promise<PushSendResult> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .maybeSingle();
  if (!data?.id) {
    console.error('[sendAdminPush] admin profile not found:', ADMIN_EMAIL);
    return { subscriptionCount: 0, sent: 0, failed: [] };
  }
  return sendPushToUser(data.id, { ...payload, url: payload.url ?? '/admin' });
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<PushSendResult> {
  if (!process.env.VAPID_SUBJECT || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.error('[sendPushToUser] VAPID env vars missing on server');
    return { subscriptionCount: 0, sent: 0, failed: [] };
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const admin = getAdminClient();
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subs?.length) {
    console.error('[sendPushToUser] no subscriptions found for user:', userId);
    return { subscriptionCount: 0, sent: 0, failed: [] };
  }

  const message = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? '/my?tab=purchases' });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, message),
    ),
  );

  const failed: PushSendResult['failed'] = [];
  const expired: string[] = [];

  results.forEach((r, i) => {
    if (r.status === 'fulfilled') return;
    const reason = r.reason as { statusCode?: number; body?: string; message?: string };
    const endpoint = subs[i].endpoint;
    console.error('[sendPushToUser] send failed:', endpoint, reason?.statusCode, reason?.body ?? reason?.message);
    failed.push({ endpoint, statusCode: reason?.statusCode, message: reason?.body ?? reason?.message ?? 'unknown error' });
    if ([410, 404].includes(reason?.statusCode ?? 0)) expired.push(endpoint);
  });

  if (expired.length) {
    await admin.from('push_subscriptions').delete().in('endpoint', expired);
  }

  return { subscriptionCount: subs.length, sent: subs.length - failed.length, failed };
}
