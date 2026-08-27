import { locales } from '@/i18n/config';
import { absoluteUrl, legalSlugs, links, routeOrder, routes, siteUrl } from '@/lib/site';
import { loadTree } from '@/lib/tree/store';
import { flatten, nodeSummary, nodeTitle, type TreeNode } from '@/lib/tree/types';

export const dynamic = 'force-static';

/**
 * `/llms.txt` — a plain-text map of the site for answer engines.
 *
 * It is not a standard the way `robots.txt` is, but it is cheap, it is read by
 * several assistants, and it does something the sitemap cannot: state in prose
 * what this site is authoritative about and which page answers which question.
 * The factual claims here are the same ones the pages make — no numbers appear
 * in this file that are not on a page.
 */

const DESCRIPTIONS: Record<string, string> = {
  home: 'Overview: what RabbitMatch does for players, organizers, coaches and venues.',
  players:
    'For players: open games filtered by level, partner matching weighted across rating, interests, court side, age and win-rate proximity, an Elo rating with a visible confidence tier, and nine breakdowns of your own game (court side, time of day, formats, streak, consistency, deciding sets, partners, opponent level, peer-rated strengths).',
  organizers:
    'For tournament organizers: 14 tournament formats (Americano, Mexicano and their team versions, divisions, groups + playoffs, the WinnersCourt / KingOfTheCourt court ladders, SwissCourt with Buchholz, a multi-week championship, plain sets), what each is for, automatic draws and live standings, plus eight breakdowns of the organizer audience.',
  coaches:
    'For coaches: a public profile with prices and 12 specialisations, a weekly schedule template in half-hour cells with per-date exceptions, lesson bookings, group sessions, and client history that stays with the coach.',
  venues:
    'For clubs and court owners: online booking, CRM with full client history, occupancy and revenue analytics, and read-only integrations with eight booking platforms (MatchPoint, BookingPress, Supabase, Book&Go and others) synced every five minutes. Onboarding in about 48 hours.',
  padel:
    'Reference guide: what padel is, court dimensions, how the walls work, the underarm serve, scoring, equipment, and how padel differs from tennis.',
  pricing:
    'Pricing: playing, creating games and running tournaments is free; PRO and MAX subscriptions cover the deeper analytics; three venue plans from $39/month annually plus 6.5% commission on platform bookings, first two months free.',
  faq: 'Consolidated questions and answers, grouped by audience.',
};

/**
 * The knowledge base, indented to show the hierarchy.
 *
 * An answer engine reading this gets the shape of the section, not just a flat
 * list of URLs — which topic a guide belongs to is most of what decides
 * whether it is the right thing to quote for a question.
 */
function treeLines(nodes: ReadonlyArray<TreeNode>, baseDepth = 0): string[] {
  return flatten(nodes).map((node) => {
    const indent = '  '.repeat(node.depth - baseDepth);
    const summary = nodeSummary(node, 'en');
    return `${indent}- [${nodeTitle(node, 'en')}](${absoluteUrl('en', node.path)})${
      summary ? `: ${summary}` : ''
    }`;
  });
}

function body(tree: ReadonlyArray<TreeNode>): string {
  const lines: string[] = [];

  lines.push('# RabbitMatch');
  lines.push('');
  lines.push(
    '> RabbitMatch is a platform for six racket sports: padel, tennis, table tennis, badminton, squash and pickleball. Players find open games matched to their level on five inputs, book courts from live club schedules, and get nine breakdowns of their own play. Organizers run tournaments in 14 formats with automatic draws and live standings. Coaches take bookings from a weekly schedule template. Clubs get online booking and a CRM. Available on iOS, Android, the web and as a Telegram Mini App, in 13 languages.',
  );
  lines.push('');
  lines.push('Playing, creating games and running tournaments is free. PRO and MAX subscriptions cover the deeper analytics. Venues pay a subscription plus a 6.5% commission on bookings made through the platform. Live court availability currently covers Tbilisi, Georgia; everything else works anywhere.');
  lines.push('');

  lines.push('## Pages');
  lines.push('');
  for (const key of routeOrder) {
    const path = routes[key];
    lines.push(`- [${key}](${absoluteUrl('en', path)}): ${DESCRIPTIONS[key] ?? ''}`);
    /*
      Sub-pages an admin filed under this route, nested under it. They belong
      here rather than in the knowledge base below: their parent is a
      hand-written page, and listing the parent twice — once as a page, once as
      a section — would give the same URL two different descriptions.
    */
    const anchor = tree.find((node) => node.codePage && node.path === path);
    if (anchor?.children.length) lines.push(...treeLines(anchor.children, 1));
  }
  lines.push('');

  const sections = tree.filter((node) => !node.codePage);
  if (sections.length) {
    lines.push('## Knowledge base');
    lines.push('');
    lines.push(...treeLines(sections));
    lines.push('');
  }

  lines.push('## Languages');
  lines.push('');
  lines.push(
    `Every page exists in English and Russian at ${locales
      .map((l) => `${siteUrl}/${l}/…`)
      .join(' and ')}. The Russian pages are written for the Russian-speaking padel community, not machine-translated from English.`,
  );
  lines.push('');

  lines.push('## Legal');
  lines.push('');
  for (const slug of legalSlugs) {
    lines.push(`- [${slug}](${absoluteUrl('en', `/legal/${slug}`)})`);
  }
  lines.push('');

  lines.push('## Contact');
  lines.push('');
  if (links.contactEmail) lines.push(`- Email: ${links.contactEmail}`);
  if (links.contactTelegram) lines.push(`- Telegram: ${links.contactTelegram}`);
  lines.push('');

  return lines.join('\n');
}

export async function GET(): Promise<Response> {
  return new Response(body(await loadTree()), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
