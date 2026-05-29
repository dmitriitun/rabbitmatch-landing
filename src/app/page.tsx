import { getTranslations } from 'next-intl/server';
import { Comparison } from '@/components/Comparison/Comparison';
import { Contact } from '@/components/Contact/Contact';
import { ForOrganizers } from '@/components/ForOrganizers/ForOrganizers';
import { ForPlayers } from '@/components/ForPlayers/ForPlayers';
import { Hero } from '@/components/Hero/Hero';
import { Launch } from '@/components/Launch/Launch';
import { Players } from '@/components/Players/Players';
import { Pricing } from '@/components/Pricing/Pricing';
import { Solution } from '@/components/Solution/Solution';
import styles from './page.module.css';

type SectionKey = 'sports' | 'social' | 'download';

const PLACEHOLDER_SECTIONS: SectionKey[] = ['sports', 'social', 'download'];

const SECTION_LABEL_KEY: Record<SectionKey, 'sports' | 'social' | 'download'> = {
  sports: 'sports',
  social: 'social',
  download: 'download',
};

export default async function Home() {
  const t = await getTranslations('sections');

  return (
    <div className={styles.page}>
      <main>
        <Hero />
        <Solution />
        <Players />
        <ForOrganizers />
        <ForPlayers />
        <Launch />
        <Comparison />
        <Pricing />

        {PLACEHOLDER_SECTIONS.map((key) => {
          const labelKey = SECTION_LABEL_KEY[key];
          const label = t(labelKey);
          return (
            <section
              key={key}
              id={key}
              className={`${styles.section} ${styles.hiddenSection}`}
              aria-label={label}
              aria-hidden="true"
              hidden
            >
              <div className={styles.container}>
                <div className={styles.placeholder}>
                  <h2>{label}</h2>
                  <p>Section placeholder — content coming soon.</p>
                </div>
              </div>
            </section>
          );
        })}

        <Contact />
      </main>
    </div>
  );
}
