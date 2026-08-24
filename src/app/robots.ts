import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

/**
 * Crawler rules.
 *
 * Answer-engine crawlers (GPTBot, ClaudeBot, PerplexityBot and friends) are
 * allowed deliberately: the site's growth plan depends on being the source
 * that gets quoted when someone asks an assistant what padel is or how an
 * Americano works. They are listed explicitly rather than left to the `*`
 * rule so the intent is visible to whoever reads this next.
 *
 * Only `/api` is disallowed — nothing there is content, and letting crawlers
 * hammer route handlers costs CPU on an always-on container.
 */
export default function robots(): MetadataRoute.Robots {
  const answerEngines = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-User',
    'PerplexityBot',
    'Google-Extended',
    'Applebot-Extended',
  ];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/'] },
      { userAgent: answerEngines, allow: '/', disallow: ['/api/'] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
