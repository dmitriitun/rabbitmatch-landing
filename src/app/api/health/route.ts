export const dynamic = 'force-dynamic';

/**
 * Liveness probe for the platform health check.
 *
 * Deliberately does not touch Postgres: a health check that fails on a
 * transient database blip would have Railway restart a container that is
 * perfectly capable of serving the (statically rendered) site.
 */
export function GET(): Response {
  return Response.json({ ok: true, uptime: Math.round(process.uptime()) });
}
