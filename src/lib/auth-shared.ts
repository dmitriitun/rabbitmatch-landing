/**
 * Constants shared between server auth code and client components.
 *
 * `lib/auth.ts` is `server-only` (it imports `jose`, `bcryptjs` and
 * `next/headers`), so client components can't import from it. These two names
 * are all the client needs.
 */

export const AUTH_COOKIE = 'rm_session';

/**
 * Readable companion to the httpOnly session cookie. It carries no
 * authority — the server never trusts it — it only tells the browser
 * "it is worth asking `/api/auth/me` who you are", so anonymous visitors
 * never make that request and pages stay statically renderable.
 */
export const AUTH_HINT_COOKIE = 'rm_signed_in';
