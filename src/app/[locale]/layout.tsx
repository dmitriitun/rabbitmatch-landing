import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Onest } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminEditLayer } from '@/components/AdminEditLayer/AdminEditLayer';
import { BuilderLauncher } from '@/components/Builder/BuilderLauncher';
import { ChatWidget } from '@/components/ChatWidget/ChatWidget';
import { CookieConsent } from '@/components/CookieConsent/CookieConsent';
import { Footer } from '@/components/Footer/Footer';
import { Header } from '@/components/Header/Header';
import { JsonLd } from '@/components/JsonLd/JsonLd';
import { AuthProvider } from '@/components/Providers/AuthProvider';
import { isLocale, locales, localeHreflang, type Locale } from '@/i18n/config';
import { loadMessages, pickClientMessages } from '@/lib/messages';
import { absoluteUrl, alternatesFor, siteName, siteUrl } from '@/lib/site';
import { appNode, graph, organizationNode, webSiteNode } from '@/lib/structured-data';
import '../globals.css';

/**
 * One family for the whole site. Onest carries a real Cyrillic cut across the
 * full weight range, so the display headings and the body copy come from a
 * single font file rather than pairing two families and paying for two
 * downloads before first paint.
 */
const onest = Onest({
  variable: '--font-onest',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '800'],
  display: 'swap',
});

/** Prerender both locales at build time; nothing here is request-dependent. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t('title'),
      template: `%s — ${siteName}`,
    },
    description: t('description'),
    applicationName: siteName,
    alternates: alternatesFor(locale, '/'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: absoluteUrl(locale),
      siteName,
      locale: localeHreflang[locale].replace('-', '_'),
      type: 'website',
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: siteName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    icons: {
      // Built from public/images/logo.png by `npm run build:favicon`.
      icon: [
        { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
        { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
      ],
      apple: { url: '/icons/apple-touch-icon.png', sizes: '180x180' },
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // Pins the locale for every `getTranslations` call below this point, which
  // is what allows the page to be statically rendered.
  setRequestLocale(locale);

  const messages = await loadMessages(locale);
  const t = await getTranslations({ locale, namespace: 'meta' });

  const siteGraph = graph([
    organizationNode(locale as Locale, t('description')),
    webSiteNode(locale as Locale, siteName, t('description')),
    appNode(t('description')),
  ]);

  return (
    <html lang={localeHreflang[locale]} className={onest.variable}>
      <body>
        {/*
          Only the namespaces client components actually read are handed to the
          browser. The full catalogue stays server-side for `getTranslations`.
        */}
        <NextIntlClientProvider locale={locale} messages={pickClientMessages(messages)}>
          <AuthProvider>
            <Header />
            {children}
            <Footer />
            <CookieConsent />
            <ChatWidget />
            <AdminEditLayer />
            <BuilderLauncher />
          </AuthProvider>
        </NextIntlClientProvider>
        <JsonLd data={siteGraph} />
      </body>
    </html>
  );
}
