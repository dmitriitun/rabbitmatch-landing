import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

/**
 * Next.js 16 renamed Middleware to Proxy; the contract is unchanged.
 *
 * Redirects `/` and any unprefixed path to the negotiated locale — `/players`
 * becomes `/en/players` or `/ru/players` — which is also what keeps the old
 * unprefixed URLs (`/legal/terms`) alive instead of 404ing after the move to
 * locale-prefixed routing.
 *
 * The matcher excludes `/api`, Next internals and anything containing a dot
 * (static files), so assets and route handlers never pay for locale
 * negotiation.
 *
 * Note the doubled backslash in `\\.`: this is a string literal, and a single
 * `\.` would be parsed as a plain `.` — a wildcard that matches nearly every
 * path and silently disables the proxy for all of them.
 */
export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
