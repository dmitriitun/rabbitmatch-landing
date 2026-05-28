import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { EditableText } from '@/components/EditableText/EditableText';
import styles from './legal.module.css';

const SLUGS = ['terms', 'privacy', 'cookies', 'eula', 'subscription', 'refund', 'booking'] as const;
type Slug = (typeof SLUGS)[number];

function isSlug(value: string): value is Slug {
  return (SLUGS as readonly string[]).includes(value);
}

export function generateStaticParams(): Array<{ slug: Slug }> {
  return SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isSlug(slug)) return {};
  const t = await getTranslations('legal');
  return { title: `${t(`${slug}.title`)} — RabbitMatch` };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();

  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <EditableText tKey={`legal.${slug}.title`} as="h1" className={styles.title} />
        <EditableText tKey={`legal.${slug}.body`} as="div" multiline className={styles.body} />
      </article>
    </main>
  );
}
