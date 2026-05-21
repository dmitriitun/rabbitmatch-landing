import { getTranslations } from 'next-intl/server';
import { ContactForm } from '@/components/ContactForm/ContactForm';
import { EditableText } from '@/components/EditableText/EditableText';
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
              <EditableText tKey="contact.eyebrow" as="p" className={styles.eyebrow} />
            </ScrollReveal>
            <ScrollReveal delayMs={100}>
              <EditableText tKey="contact.title" as="h2" className={styles.title} />
            </ScrollReveal>
            <ScrollReveal delayMs={200}>
              <EditableText tKey="contact.lead" as="p" multiline className={styles.lead} />
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
