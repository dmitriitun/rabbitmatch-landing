import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { CookieConsent } from '@/components/CookieConsent/CookieConsent';
import { Footer } from '@/components/Footer/Footer';
import { Header } from '@/components/Header/Header';
import { AuthProvider, type SessionUser } from '@/components/Providers/AuthProvider';
import { getSession } from '@/lib/auth';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rabbitmatch.pro';
  return {
    title: t('title'),
    description: t('description'),
    metadataBase: new URL(appUrl),
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: appUrl,
      siteName: 'RabbitMatch',
      type: 'website',
    },
    icons: {
      icon: '/favicon.ico',
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const session = await getSession();
  const initialUser: SessionUser | null = session
    ? { email: session.email, isAdmin: session.isAdmin }
    : null;

  return (
    <html lang={locale} className={inter.variable}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider initialUser={initialUser}>
            <Header />
            {children}
            <Footer />
            <CookieConsent />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
