import { getTranslations } from 'next-intl/server';
import { ContactForm } from '@/components/ContactForm/ContactForm';
import { ScrollReveal } from '@/components/ScrollReveal/ScrollReveal';
import styles from './Contact.module.css';

export async function Contact() {
  const t = await getTranslations('contact');

  return (
    <section id="contact" className={styles.section} aria-label={t('title')}>
      <div className={styles.bgGlow} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <div className={styles.container}>
        <div className={styles.layout}>
          <div className={styles.intro}>
            <ScrollReveal>
              <p className={styles.eyebrow}>{t('eyebrow')}</p>
            </ScrollReveal>
            <ScrollReveal delayMs={100}>
              <h2 className={styles.title}>{t('title')}</h2>
            </ScrollReveal>
            <ScrollReveal delayMs={200}>
              <p className={styles.lead}>{t('lead')}</p>
            </ScrollReveal>
          </div>

          <ScrollReveal delayMs={150} className={styles.formCard}>
            <ContactForm source="contact-section" variant="dark" />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
