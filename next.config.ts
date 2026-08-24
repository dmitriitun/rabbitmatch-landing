import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // pg ships native bindings; it must stay outside the server bundle.
  serverExternalPackages: ['pg'],

  /**
   * Standalone output ships only the modules the traced pages actually import,
   * plus a minimal server. On Railway this is what keeps the resident set of
   * the always-on container small — `next start` otherwise loads the full
   * dependency tree of the repo into the same process that is billed by the
   * gigabyte-minute.
   */
  output: 'standalone',

  // No value to us, one less header on every response.
  poweredByHeader: false,

  turbopack: {
    root: fileURLToPath(new URL('.', import.meta.url)),
  },

  images: {
    /**
     * Every image the site serves is already a WebP at the size it is shown:
     * the app screenshots are built by `npm run build:shots`, the logo is a
     * fixed 34px mark. Running them through the optimizer would buy nothing
     * and would pull `sharp` — and libvips' arena with it — into the resident
     * set of the always-on container, which is the thing this project is
     * trying to keep small.
     */
    unoptimized: true,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        // Hashed build assets are immutable by construction.
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        /**
         * Screenshots and the logo. These filenames are not fingerprinted, so
         * the TTL stays short and leans on revalidation instead: a header rule
         * applies to whatever the route returns, 404s included, and a month of
         * `max-age` once left a broken deploy's 404s cached at the CDN long
         * after the deploy itself was fixed.
         */
        source: '/:dir(app|images)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
