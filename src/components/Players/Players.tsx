import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Calendar, Settings2, Trophy } from 'lucide-react';
import { EditableText } from '@/components/EditableText/EditableText';
import { ScrollReveal } from '@/components/ScrollReveal/ScrollReveal';
import { PlayersCta } from './PlayersCta';
import styles from './Players.module.css';

type Block = {
  Icon: React.ComponentType<{ size?: number }>;
  titleKey: 'tournamentsTitle' | 'bookingTitle' | 'controlTitle';
  bodyKey: 'tournamentsBody' | 'bookingBody' | 'controlBody';
  highlightKey: 'tournamentsHighlight' | 'bookingHighlight' | 'controlHighlight';
};

const BLOCKS: Block[] = [
  {
    Icon: Trophy,
    titleKey: 'tournamentsTitle',
    bodyKey: 'tournamentsBody',
    highlightKey: 'tournamentsHighlight',
  },
  {
    Icon: Calendar,
    titleKey: 'bookingTitle',
    bodyKey: 'bookingBody',
    highlightKey: 'bookingHighlight',
  },
  {
    Icon: Settings2,
    titleKey: 'controlTitle',
    bodyKey: 'controlBody',
    highlightKey: 'controlHighlight',
  },
];

type PhoneSlot = {
  src: string;
  altKey: 'courts' | 'profile' | 'matchMap' | 'matchForm';
  className: string;
};

const PHONES: PhoneSlot[] = [
  { src: '/images/phone-match-form.png', altKey: 'matchForm', className: 'phone1' },
  { src: '/images/phone-match-map.png', altKey: 'matchMap', className: 'phone2' },
  { src: '/images/phone-courts-2.png', altKey: 'courts', className: 'phone3' },
  { src: '/images/phone-profile.png', altKey: 'profile', className: 'phone4' },
];

export async function Players() {
  const t = await getTranslations('players');

  return (
    <section id="crm" className={styles.section} aria-label={t('title')}>
      <div className={styles.bgGlow} aria-hidden="true" />
      <div className={styles.frameLines} aria-hidden="true">
        <span className={styles.cornerTL} />
        <span className={styles.cornerBR} />
      </div>

      <div className={styles.container}>
        <ScrollReveal>
          <EditableText tKey="players.eyebrow" as="p" className={styles.eyebrow} />
        </ScrollReveal>
        <ScrollReveal delayMs={80}>
          <EditableText tKey="players.title" as="h2" className={styles.title} />
        </ScrollReveal>

        <div className={styles.grid}>
          <div className={styles.textCol}>
            {BLOCKS.map(({ Icon, titleKey, bodyKey, highlightKey }, idx) => (
              <ScrollReveal key={titleKey} delayMs={180 + idx * 120} className={styles.block}>
                <header className={styles.blockHead}>
                  <span className={styles.blockIcon} aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <EditableText tKey={`players.${titleKey}`} as="h3" className={styles.blockTitle} />
                </header>
                <EditableText tKey={`players.${bodyKey}`} as="p" multiline className={styles.blockBody} />
                <EditableText tKey={`players.${highlightKey}`} as="p" className={styles.blockHighlight} />
              </ScrollReveal>
            ))}

            <ScrollReveal delayMs={560} className={styles.ctaWrap}>
              <PlayersCta label={t('cta')} />
            </ScrollReveal>
          </div>

          <div className={styles.phonesCol}>
            <div className={styles.phoneFan}>
              {PHONES.map((phone, idx) => (
                <ScrollReveal
                  key={phone.src}
                  delayMs={220 + idx * 110}
                  className={`${styles.phoneSlot} ${styles[phone.className]}`}
                >
                  <Image
                    src={phone.src}
                    alt={t(`phoneAlt.${phone.altKey}`)}
                    width={720}
                    height={1280}
                    sizes="(max-width: 900px) 45vw, 240px"
                    className={styles.phoneImg}
                  />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
