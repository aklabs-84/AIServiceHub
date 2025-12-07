export type SlackNotifyPayload =
  | { type: 'app'; id: string; name: string; author: string; url?: string }
  | { type: 'prompt'; id: string; name: string; author: string; category?: string }
  | { type: 'signup'; uid: string; email?: string; name?: string };

export async function sendSlackNotification(payload: SlackNotifyPayload) {
  try {
    await fetch('/api/notify/slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Failed to send Slack notification', err);
  }
}
