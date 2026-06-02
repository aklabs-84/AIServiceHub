import type { MetadataRoute } from 'next';
import { getAdminClient } from '@/lib/database';

const BASE_URL = 'https://ai-service-hub.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const client = getAdminClient();

  const [appsResult, promptsResult] = await Promise.all([
    client.from('apps').select('id, updated_at').eq('is_public', true),
    client.from('prompts').select('id, updated_at').eq('is_public', true),
  ]);

  const appEntries: MetadataRoute.Sitemap = (appsResult.data ?? []).map((app) => ({
    url: `${BASE_URL}/apps/${app.id}`,
    lastModified: new Date(app.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const promptEntries: MetadataRoute.Sitemap = (promptsResult.data ?? []).map((prompt) => ({
    url: `${BASE_URL}/prompts/${prompt.id}`,
    lastModified: new Date(prompt.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/apps`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/prompts`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/classes`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...appEntries,
    ...promptEntries,
  ];
}
