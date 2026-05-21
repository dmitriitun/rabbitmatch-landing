import { Check, X } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ScrollReveal } from '@/components/ScrollReveal/ScrollReveal';
import styles from './Comparison.module.css';

type Tone = 'lime' | 'red' | 'neutral';

type Cell =
  | { kind: 'check'; count?: 1 | 3; tone: Tone }
  | { kind: 'cross'; tone: Tone }
  | { kind: 'text'; value: string; tone: Tone };

type Row = {
  id: string;
  labelKey: string;
  excel: Cell;
  playtomic: Cell;
  rabbit: Cell;
};

const ROWS: Row[] = [
  {
    id: 'onlineBooking',
    labelKey: 'rows.onlineBooking',
    excel: { kind: 'cross', tone: 'red' },
    playtomic: { kind: 'check', tone: 'neutral' },
    rabbit: { kind: 'check', tone: 'lime' },
  },
  {
    id: 'ecosystem',
    labelKey: 'rows.ecosystem',
    excel: { kind: 'cross', tone: 'red' },
    playtomic: { kind: 'text', value: 'simple', tone: 'neutral' },
    rabbit: { kind: 'text', value: 'full', tone: 'lime' },
  },
  {
    id: 'crm',
    labelKey: 'rows.crm',
    excel: { kind: 'cross', tone: 'red' },
    playtomic: { kind: 'check', tone: 'neutral' },
    rabbit: { kind: 'check', count: 3, tone: 'lime' },
  },
  {
    id: 'tournaments',
    labelKey: 'rows.tournaments',
    excel: { kind: 'cross', tone: 'red' },
    playtomic: { kind: 'text', value: 'minimal', tone: 'neutral' },
    rabbit: { kind: 'text', value: 'diverse', tone: 'lime' },
  },
  {
    id: 'localization',
    labelKey: 'rows.localization',
    excel: { kind: 'cross', tone: 'red' },
    playtomic: { kind: 'text', value: 'noGeorgia', tone: 'neutral' },
    rabbit: { kind: 'text', value: 'full', tone: 'lime' },
  },
  {
    id: 'telegram',
    labelKey: 'rows.telegram',
    excel: { kind: 'cross', tone: 'red' },
    playtomic: { kind: 'cross', tone: 'red' },
    rabbit: { kind: 'check', tone: 'lime' },
  },
  {
    id: 'commission',
    labelKey: 'rows.commission',
    excel: { kind: 'text', value: 'bankAcquiring', tone: 'neutral' },
    playtomic: { kind: 'text', value: 'playtomicCommission', tone: 'red' },
    rabbit: { kind: 'text', value: 'rabbitCommission', tone: 'lime' },
  },
  {
    id: 'price',
    labelKey: 'rows.price',
    excel: { kind: 'text', value: 'errorsLoss', tone: 'neutral' },
    playtomic: { kind: 'text', value: 'playtomicPrice', tone: 'red' },
    rabbit: { kind: 'text', value: 'rabbitPrice', tone: 'lime' },
  },
];

function toneClass(tone: Tone): string {
  if (tone === 'lime') return styles.toneLime;
  if (tone === 'red') return styles.toneRed;
  return styles.toneNeutral;
}

function CellView({
  cell,
  values,
}: {
  cell: Cell;
  values: (key: string) => string;
}) {
  if (cell.kind === 'check') {
    const count = cell.count ?? 1;
    return (
      <span className={`${styles.icons} ${toneClass(cell.tone)}`} aria-label="yes">
        {Array.from({ length: count }, (_, i) => (
          <Check key={i} size={22} strokeWidth={2.4} />
        ))}
      </span>
    );
  }
  if (cell.kind === 'cross') {
    return (
      <span className={`${styles.icons} ${toneClass(cell.tone)}`} aria-label="no">
        <X size={22} strokeWidth={2.4} />
      </span>
    );
  }
  return <span className={`${styles.cellText} ${toneClass(cell.tone)}`}>{values(cell.value)}</span>;
}

export async function Comparison() {
  const t = await getTranslations('comparison');
  const v = (key: string) => t(`values.${key}`);

  return (
    <section id="comparison" className={styles.section} aria-label={t('title')}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className={styles.container}>
        <ScrollReveal>
          <h2 className={styles.title}>{t('title')}</h2>
        </ScrollReveal>

        {/* Desktop table */}
        <div className={styles.tableScroll}>
          <table className={styles.table} aria-describedby="comparison-title">
            <thead>
              <tr>
                <th scope="col" className={`${styles.colOpportunity} ${styles.thead}`}>
                  {t('colOpportunity')}
                </th>
                <th scope="col" className={`${styles.colCenter} ${styles.thead}`}>
                  {t('colExcel')}
                </th>
                <th scope="col" className={`${styles.colCenter} ${styles.thead}`}>
                  {t('colPlaytomic')}
                </th>
                <th scope="col" className={`${styles.colCenter} ${styles.thead} ${styles.theadRabbit}`}>
                  {t('colRabbit')}
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, idx) => (
                <ScrollReveal key={row.id} as="tr" delayMs={120 + idx * 70} className={styles.row}>
                  <th scope="row" className={`${styles.opportunity} ${styles.cell}`}>
                    {t(row.labelKey)}
                  </th>
                  <td className={`${styles.cell} ${styles.colCenter}`}>
                    <CellView cell={row.excel} values={v} />
                  </td>
                  <td className={`${styles.cell} ${styles.colCenter}`}>
                    <CellView cell={row.playtomic} values={v} />
                  </td>
                  <td className={`${styles.cell} ${styles.colCenter} ${styles.cellRabbit}`}>
                    <CellView cell={row.rabbit} values={v} />
                  </td>
                </ScrollReveal>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card stack */}
        <ul className={styles.cards}>
          {ROWS.map((row, idx) => (
            <ScrollReveal key={row.id} as="li" delayMs={80 + idx * 70} className={styles.card}>
              <h3 className={styles.cardTitle}>{t(row.labelKey)}</h3>
              <dl className={styles.cardList}>
                <div className={styles.cardRow}>
                  <dt>{t('colExcel')}</dt>
                  <dd><CellView cell={row.excel} values={v} /></dd>
                </div>
                <div className={styles.cardRow}>
                  <dt>{t('colPlaytomic')}</dt>
                  <dd><CellView cell={row.playtomic} values={v} /></dd>
                </div>
                <div className={`${styles.cardRow} ${styles.cardRowRabbit}`}>
                  <dt>{t('colRabbit')}</dt>
                  <dd><CellView cell={row.rabbit} values={v} /></dd>
                </div>
              </dl>
            </ScrollReveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
