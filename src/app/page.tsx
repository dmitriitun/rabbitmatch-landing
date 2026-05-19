import { getTranslations } from 'next-intl/server';
import styles from './page.module.css';

type SectionKey = 'hero' | 'features' | 'sports' | 'crm' | 'social' | 'download' | 'contact';

const SECTION_IDS: SectionKey[] = ['hero', 'features', 'sports', 'crm', 'social', 'download', 'contact'];

export default async function Home() {
  const t = await getTranslations('sections');
  const tHero = await getTranslations('hero');

  const labelForSection = (key: SectionKey): string => {
    if (key === 'hero') return tHero('title');
    return t(key);
  };

  return (
    <div className={styles.page}>
      <main>
        {SECTION_IDS.map((key) => (
          <section key={key} id={key} className={styles.section} aria-label={labelForSection(key)}>
            <div className={styles.container}>
              <div className={styles.placeholder}>
                <h2>{labelForSection(key)}</h2>
                <p>Section placeholder — content coming soon.</p>
              </div>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
