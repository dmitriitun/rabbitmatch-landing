import { getTranslations } from 'next-intl/server';
import { ContactForm } from '@/components/ContactForm/ContactForm';
import { EditableText } from '@/components/EditableText/EditableText';
import styles from './Contact.module.css';

export async function Contact() {
  const t = await getTranslations('contact');

  return (
    <section id="contact" className={styles.section} aria-labelledby="contact-title">
      <div className={styles.container}>
        <div className={styles.layout}>
          <div className={styles.intro}>
            <EditableText tKey="contact.eyebrow" as="p" className={styles.eyebrow} />
            <h2 id="contact-title" className={styles.title} data-rm-key="contact.title">
              {t('title')}
            </h2>
            <EditableText tKey="contact.lead" as="p" multiline className={styles.lead} />
          </div>

          <div className={styles.formCard}>
            <ContactForm source="contact-section" />
          </div>
        </div>
      </div>
    </section>
  );
}
