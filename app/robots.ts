import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/auth/', '/my/', '/my-apps/', '/payment/', '/one-time-login/'],
    },
    sitemap: 'https://ai-service-hub.vercel.app/sitemap.xml',
  };
}
