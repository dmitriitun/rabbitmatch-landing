import { getTranslations } from 'next-intl/server';
import { Hero } from '@/components/Hero/Hero';
import { Solution } from '@/components/Solution/Solution';
import styles from './page.module.css';

type SectionKey = 'sports' | 'crm' | 'pricing' | 'social' | 'download' | 'contact';

const PLACEHOLDER_SECTIONS: SectionKey[] = [
  'sports',
  'crm',
  'pricing',
  'social',
  'download',
  'contact',
];

const SECTION_LABEL_KEY: Record<SectionKey, 'sports' | 'crm' | 'social' | 'download' | 'contact' | 'pricing'> = {
  sports: 'sports',
  crm: 'crm',
  pricing: 'crm',
  social: 'social',
  download: 'download',
  contact: 'contact',
};

export default async function Home() {
  const t = await getTranslations('sections');

  return (
    <div className={styles.page}>
      <main>
        <Hero />
        <Solution />

        {PLACEHOLDER_SECTIONS.map((key) => {
          const labelKey = SECTION_LABEL_KEY[key];
          const label = key === 'pricing' ? 'Pricing' : t(labelKey);
          return (
            <section key={key} id={key} className={styles.section} aria-label={label}>
              <div className={styles.container}>
                <div className={styles.placeholder}>
                  <h2>{label}</h2>
                  <p>Section placeholder — content coming soon.</p>
                </div>
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
