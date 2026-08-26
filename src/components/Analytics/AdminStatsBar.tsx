'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, ExternalLink, Loader, RefreshCw, X } from 'lucide-react';
import { useAuthOptional } from '@/components/Providers/AuthProvider';
import type { AnalyticsSummary } from '@/lib/analytics';
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

function delta(now: number, before: number): { text: string; up: boolean } | null {
  if (!before) return null;
  const change = Math.round(((now - before) / before) * 100);
  if (!Number.isFinite(change) || change === 0) return null;
  return { text: `${change > 0 ? '+' : ''}${change}%`, up: change > 0 };
}

export function AdminStatsBar() {
  const auth = useAuthOptional();
  const isAdmin = auth?.user?.isAdmin === true;

  const [open, setOpen] = useState(false);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/summary', { credentials: 'same-origin' });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { summary: AnalyticsSummary };
      setData(body.summary);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  /*
    The pill shows today's count, so the first fetch happens as soon as an
    admin is known — not when the panel opens. It is deferred by a beat rather
    than fired from the effect body: the page has just finished loading, and
    an aggregate over the traffic table is the last thing that should compete
    with it.

    Refreshing on a timer only runs while the panel is open. A closed pill does
    not need to be live, and the query behind it is the most expensive read in
    the app.
  */
  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => void load(), 600);
    return () => clearTimeout(timer);
  }, [isAdmin, load]);

  useEffect(() => {
    if (!isAdmin || !open) return;
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [isAdmin, load, open]);

  if (!isAdmin) return null;

  const today = data?.today;
  const trend = data ? delta(data.today.views, data.yesterday.views) : null;

  return (
    <div className={styles.root}>
      {open && data ? (
        <section className={styles.panel} aria-label="Статистика сайта">
          <header className={styles.head}>
            <BarChart3 size={15} aria-hidden="true" />
            <strong>Статистика сайта</strong>
            {data.online > 0 ? (
              <span className={styles.live}>
                <span className={styles.liveDot} aria-hidden="true" />
                {nf.format(data.online)} сейчас
              </span>
            ) : null}
            <span className={styles.spacer} />
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => void load()}
              disabled={loading}
              title="Обновить"
            >
              {loading ? <Loader size={14} /> : <RefreshCw size={14} />}
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setOpen(false)}
              aria-label="Свернуть"
            >
              <X size={14} />
            </button>
          </header>

          <div className={styles.body}>
            {!data.available ? (
              <p className={styles.note}>
                База аналитики недоступна — цифры появятся, как только соединение вернётся.
              </p>
            ) : null}

            <div className={styles.tiles}>
              <Tile label="Сегодня" totals={data.today} trend={trend} />
              <Tile label="Вчера" totals={data.yesterday} />
              <Tile label="7 дней" totals={data.week} />
              <Tile label="30 дней" totals={data.month} />
            </div>

            <Sparkline daily={data.daily} />

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
            />

            <p className={styles.foot}>
              Без cookie: посетитель определяется дневным хешем IP и браузера. Заходы админов не
              считаются.
            </p>
          </div>
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

/**
 * Thirty days of traffic as bars.
 *
 * Heights are a share of the busiest day rather than an absolute scale: the
 * question this answers is "is it growing", and a fixed scale would flatten
 * every week that is not the record one into the same stub.
 */
function Sparkline({ daily }: { daily: AnalyticsSummary['daily'] }) {
  if (!daily.length) return null;
  const peak = daily.reduce((max, day) => Math.max(max, day.views), 0);
  if (!peak) return null;

  return (
    <div className={styles.chart} aria-hidden="true">
      {daily.map((day) => (
        <span
          key={day.day}
          className={styles.bar}
          style={{ height: `${Math.max(3, Math.round((day.views / peak) * 100))}%` }}
          title={`${day.day}: ${nf.format(day.views)} просмотров, ${nf.format(day.visitors)} посетителей`}
        />
      ))}
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
