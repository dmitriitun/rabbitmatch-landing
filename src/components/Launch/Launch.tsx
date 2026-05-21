import { getTranslations } from 'next-intl/server';
import { EditableText } from '@/components/EditableText/EditableText';
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
    <section id="onboarding" className={styles.section} aria-label={t('title')}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.col}>
            <ScrollReveal>
              <EditableText tKey="launch.eyebrow" as="p" className={styles.eyebrow} />
            </ScrollReveal>

            <ScrollReveal delayMs={120}>
              <EditableText tKey="launch.title" as="h2" className={styles.title} />
            </ScrollReveal>

            <ScrollReveal delayMs={220}>
              <p className={styles.intro}>
                <EditableText tKey="launch.intro1Highlight" as="span" className={styles.introHighlight} />{' '}
                <EditableText tKey="launch.intro1Body" as="span" multiline />
              </p>
            </ScrollReveal>

            <ScrollReveal delayMs={300}>
              <p className={styles.intro}>
                <EditableText tKey="launch.intro2Highlight" as="span" className={styles.introHighlight} />{' '}
                <EditableText tKey="launch.intro2Body" as="span" multiline />
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
                      <EditableText tKey={`launch.${step.titleKey}`} as="h4" className={styles.stepTitle} />
                      <EditableText tKey={`launch.${step.bodyKey}`} as="p" multiline className={styles.stepText} />
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
