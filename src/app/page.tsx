import { getTranslations } from 'next-intl/server';
import { Comparison } from '@/components/Comparison/Comparison';
import { Hero } from '@/components/Hero/Hero';
import { Launch } from '@/components/Launch/Launch';
import { Players } from '@/components/Players/Players';
import { Pricing } from '@/components/Pricing/Pricing';
import { Solution } from '@/components/Solution/Solution';
import styles from './page.module.css';

type SectionKey = 'sports' | 'social' | 'download' | 'contact';

const PLACEHOLDER_SECTIONS: SectionKey[] = [
  'sports',
  'social',
  'download',
  'contact',
];

const SECTION_LABEL_KEY: Record<SectionKey, 'sports' | 'social' | 'download' | 'contact'> = {
  sports: 'sports',
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
        <Players />
        <Launch />
        <Comparison />
        <Pricing />

        {PLACEHOLDER_SECTIONS.map((key) => {
          const labelKey = SECTION_LABEL_KEY[key];
          const label = t(labelKey);
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
