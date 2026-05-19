import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pg'],
  turbopack: {
    root: fileURLToPath(new URL('.', import.meta.url)),
  },
};

export default withNextIntl(nextConfig);
