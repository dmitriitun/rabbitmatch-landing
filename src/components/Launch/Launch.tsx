import { getTranslations } from 'next-intl/server';
import { ScrollReveal } from '@/components/ScrollReveal/ScrollReveal';
import { RunnerArt } from './RunnerArt';
import styles from './Launch.module.css';

type Step = {
  num: '01' | '02' | '03';
  titleKey: 'step1Title' | 'step2Title' | 'step3Title';
  bodyKey: 'step1Body' | 'step2Body' | 'step3Body';
};

const STEPS: Step[] = [
  { num: '01', titleKey: 'step1Title', bodyKey: 'step1Body' },
  { num: '02', titleKey: 'step2Title', bodyKey: 'step2Body' },
  { num: '03', titleKey: 'step3Title', bodyKey: 'step3Body' },
];

export async function Launch() {
  const t = await getTranslations('launch');

  return (
    <section id="pricing" className={styles.section} aria-label={t('title')}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.col}>
            <ScrollReveal>
              <p className={styles.eyebrow}>{t('eyebrow')}</p>
            </ScrollReveal>

            <ScrollReveal delayMs={120}>
              <h2 className={styles.title}>{t('title')}</h2>
            </ScrollReveal>

            <ScrollReveal delayMs={220}>
              <p className={styles.intro}>
                <span className={styles.introHighlight}>{t('intro1Highlight')}</span>{' '}
                {t('intro1Body')}
              </p>
            </ScrollReveal>

            <ScrollReveal delayMs={300}>
              <p className={styles.intro}>
                <span className={styles.introHighlight}>{t('intro2Highlight')}</span>{' '}
                {t('intro2Body')}
              </p>
            </ScrollReveal>

            <ol className={styles.steps}>
              {STEPS.map((step, idx) => (
                <ScrollReveal
                  key={step.num}
                  delayMs={460 + idx * 140}
                  as="li"
                  className={styles.stepWrap}
                >
                  <div className={styles.step}>
                    <span className={styles.stepNum} aria-hidden="true">
                      {step.num}
                    </span>
                    <div className={styles.stepBody}>
                      <h4 className={styles.stepTitle}>{t(step.titleKey)}</h4>
                      <p className={styles.stepText}>{t(step.bodyKey)}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </ol>
          </div>

          <ScrollReveal delayMs={220} className={styles.artCol}>
            <div className={styles.runnerWrap}>
              <div className={styles.runnerGlow} aria-hidden="true" />
              <RunnerArt ariaLabel={t('runnerAlt')} />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
