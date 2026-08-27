'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { BarChart3, ExternalLink, Gauge, Loader, RefreshCw, X } from 'lucide-react';
import { useAuthOptional } from '@/components/Providers/AuthProvider';
import { usePathname } from '@/i18n/navigation';
import {
  ANALYTICS_RANGES,
  DEFAULT_RANGE,
  type AnalyticsRange,
  type AnalyticsSummary,
} from '@/lib/analytics-shared';
import { SeoAudit } from './SeoAudit';
import styles from './stats.module.css';

/**
 * Site traffic, for signed-in admins only.
 *
 * It renders `null` for everyone else and fetches nothing until an admin
 * session is confirmed, so a visitor pays for one component that returns early
 * and no request at all. Same shape as the builder launcher, which sits beside
 * it in the same corner.
 *
 * The panel opens closed and collapses to a pill showing today's numbers,
 * because that is the number worth glancing at; everything else is one click
 * away and does not deserve to cover the page it describes.
 */

const REFRESH_MS = 60_000;

const nf = new Intl.NumberFormat('ru-RU');

const RANGE_LABEL: Record<AnalyticsRange, string> = {
  7: '7 дней',
  30: '30 дней',
  90: '90 дней',
  365: 'Год',
};

type Tab = 'traffic' | 'seo';

function delta(now: number, before: number): { text: string; up: boolean } | null {
  if (!before) return null;
  const change = Math.round(((now - before) / before) * 100);
  if (!Number.isFinite(change) || change === 0) return null;
  return { text: `${change > 0 ? '+' : ''}${change}%`, up: change > 0 };
}

export function AdminStatsBar() {
  const auth = useAuthOptional();
  const isAdmin = auth?.user?.isAdmin === true;
  const locale = useLocale();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('traffic');
  const [range, setRange] = useState<AnalyticsRange>(DEFAULT_RANGE);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/summary?range=${range}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { summary: AnalyticsSummary };
      setData(body.summary);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [range]);

  /*
    The pill shows today's count, so the first fetch happens as soon as an
    admin is known — not when the panel opens. It is deferred by a beat rather
    than fired from the effect body: the page has just finished loading, and
    an aggregate over the traffic table is the last thing that should compete
    with it.

    Changing the range refetches through the same effect, because `load` is
    keyed to it.

    Refreshing on a timer only runs while the panel is open on the traffic tab.
    A closed pill does not need to be live, and the query behind it is the most
    expensive read in the app.
  */
  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => void load(), 600);
    return () => clearTimeout(timer);
  }, [isAdmin, load]);

  useEffect(() => {
    if (!isAdmin || !open || tab !== 'traffic') return;
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [isAdmin, load, open, tab]);

  if (!isAdmin) return null;

  const today = data?.today;
  const trend = data ? delta(data.today.views, data.yesterday.views) : null;

  return (
    <div className={styles.root}>
      {open ? (
        <section className={styles.panel} aria-label="Статистика сайта">
          <header className={styles.head}>
            <BarChart3 size={15} aria-hidden="true" />
            <strong>Статистика сайта</strong>
            {data && data.online > 0 ? (
              <span className={styles.live}>
                <span className={styles.liveDot} aria-hidden="true" />
                {nf.format(data.online)} сейчас
              </span>
            ) : null}
            <span className={styles.spacer} />
            {tab === 'traffic' ? (
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => void load()}
                disabled={loading}
                title="Обновить"
              >
                {loading ? <Loader size={14} /> : <RefreshCw size={14} />}
              </button>
            ) : null}
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setOpen(false)}
              aria-label="Свернуть"
            >
              <X size={14} />
            </button>
          </header>

          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'traffic'}
              className={`${styles.tab} ${tab === 'traffic' ? styles.tabOn : ''}`}
              onClick={() => setTab('traffic')}
            >
              <BarChart3 size={13} aria-hidden="true" />
              Трафик
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'seo'}
              className={`${styles.tab} ${tab === 'seo' ? styles.tabOn : ''}`}
              onClick={() => setTab('seo')}
            >
              <Gauge size={13} aria-hidden="true" />
              SEO и AI
            </button>
          </div>

          {tab === 'seo' ? (
            <SeoAudit path={pathname || '/'} locale={locale} />
          ) : !data ? (
            <div className={styles.body}>
              <p className={styles.note}>{failed ? 'Статистика недоступна.' : 'Загружаю…'}</p>
            </div>
          ) : (
            <div className={styles.body}>
              {!data.available ? (
                <p className={styles.note}>
                  База аналитики недоступна — цифры появятся, как только соединение вернётся.
                </p>
              ) : null}

              <div className={styles.ranges} role="group" aria-label="Период">
                {ANALYTICS_RANGES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={range === option}
                    className={`${styles.rangeBtn} ${range === option ? styles.rangeOn : ''}`}
                    onClick={() => setRange(option)}
                  >
                    {RANGE_LABEL[option]}
                  </button>
                ))}
              </div>

              <div className={styles.tiles}>
                <Tile label="Сегодня" totals={data.today} trend={trend} />
                <Tile label="Вчера" totals={data.yesterday} />
                <Tile label="7 дней" totals={data.week} />
                <Tile label="30 дней" totals={data.month} />
                <Tile label="Год" totals={data.year} />
                <Tile label={RANGE_LABEL[data.range]} totals={data.selected} />
              </div>

              <Chart summary={data} />

              <Column
                title="Страницы"
                empty="Пока ни одного просмотра."
                rows={data.topPaths.map((row) => ({
                  key: row.path,
                  label: row.path,
                  href: row.path,
                  value: `${nf.format(row.views)} / ${nf.format(row.visitors)}`,
                }))}
                hint="просмотры / посетители"
              />

              <Column
                title="Источники"
                empty="Все заходы прямые — по ссылке или из закладок."
                rows={data.topReferrers.map((row) => ({
                  key: row.host,
                  label: row.host,
                  value: nf.format(row.views),
                }))}
              />

              <Column
                title="Материалы"
                empty="Счётчики статей начнут считать после первых заходов."
                rows={data.topArticles.map((row) => ({
                  key: row.path,
                  label: row.title,
                  href: row.path,
                  value: nf.format(row.views),
                }))}
                hint="за всё время"
              />

              <p className={styles.foot}>
                Без cookie: посетитель определяется дневным хешем IP и браузера. Заходы админов не
                считаются. История хранится {nf.format(data.retentionDays)} дней — год с запасом,
                поэтому сезонность видно целиком.
              </p>
            </div>
          )}
        </section>
      ) : null}

      <button
        type="button"
        className={styles.pill}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <BarChart3 size={15} aria-hidden="true" />
        {failed ? (
          'Статистика недоступна'
        ) : today ? (
          <>
            Сегодня <strong>{nf.format(today.views)}</strong>
            <span className={styles.pillMuted}>/ {nf.format(today.visitors)} чел.</span>
            {trend ? (
              <span className={trend.up ? styles.up : styles.down}>{trend.text}</span>
            ) : null}
          </>
        ) : (
          'Статистика…'
        )}
      </button>
    </div>
  );
}

function Tile({
  label,
  totals,
  trend,
}: {
  label: string;
  totals: { views: number; visitors: number };
  trend?: { text: string; up: boolean } | null;
}) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>
        {nf.format(totals.views)}
        {trend ? (
          <span className={trend.up ? styles.up : styles.down}>{trend.text}</span>
        ) : null}
      </span>
      <span className={styles.tileSub}>{nf.format(totals.visitors)} посетителей</span>
    </div>
  );
}

const MONTHS = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

/** `2026-08-27` → `27.08`, `2026-08` → `авг 26`. */
function bucketLabel(key: string, unit: 'day' | 'month'): string {
  if (unit === 'month') {
    const [year, month] = key.split('-');
    return `${MONTHS[Number(month) - 1] ?? month} ${year.slice(2)}`;
  }
  const [, month, day] = key.split('-');
  return `${day}.${month}`;
}

/**
 * The selected window as bars.
 *
 * Heights are a share of the busiest bucket rather than an absolute scale: the
 * question this answers is "is it growing", and a fixed scale would flatten
 * every week that is not the record one into the same stub.
 */
function Chart({ summary }: { summary: AnalyticsSummary }) {
  const { series, seriesUnit } = summary;
  if (!series.length) return null;
  const peak = series.reduce((max, point) => Math.max(max, point.views), 0);
  if (!peak) return null;

  return (
    <div>
      <div className={styles.chart}>
        {series.map((point) => (
          <span
            key={point.key}
            className={styles.bar}
            style={{ height: `${Math.max(3, Math.round((point.views / peak) * 100))}%` }}
            title={`${bucketLabel(point.key, seriesUnit)}: ${nf.format(point.views)} просмотров, ${nf.format(point.visitors)} посетителей`}
          />
        ))}
      </div>
      <div className={styles.chartAxis} aria-hidden="true">
        <span>{bucketLabel(series[0].key, seriesUnit)}</span>
        <span>пик: {nf.format(peak)}</span>
        <span>{bucketLabel(series[series.length - 1].key, seriesUnit)}</span>
      </div>
    </div>
  );
}

function Column({
  title,
  rows,
  empty,
  hint,
}: {
  title: string;
  rows: Array<{ key: string; label: string; value: string; href?: string }>;
  empty: string;
  hint?: string;
}) {
  return (
    <div className={styles.column}>
      <p className={styles.columnTitle}>
        {title}
        {hint ? <span className={styles.columnHint}>{hint}</span> : null}
      </p>
      {rows.length ? (
        <ul className={styles.rows}>
          {rows.map((row) => (
            <li key={row.key} className={styles.row}>
              {row.href ? (
                <a href={row.href} className={styles.rowLabel} title={row.label}>
                  {row.label}
                  <ExternalLink size={11} aria-hidden="true" />
                </a>
              ) : (
                <span className={styles.rowLabel} title={row.label}>
                  {row.label}
                </span>
              )}
              <span className={styles.rowValue}>{row.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.note}>{empty}</p>
      )}
    </div>
  );
}
