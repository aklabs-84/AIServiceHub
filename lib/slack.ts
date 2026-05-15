const WEBHOOK = process.env.SLACK_WEBHOOK_URL;

export async function sendSlack(text: string): Promise<void> {
  if (!WEBHOOK) return;
  await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}
