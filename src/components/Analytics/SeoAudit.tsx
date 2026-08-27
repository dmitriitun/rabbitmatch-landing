'use client';

import { useCallback, useState } from 'react';
import { AlertTriangle, CheckCircle2, Gauge, Loader, RefreshCw, XCircle } from 'lucide-react';
import type { AuditResult, Check, CheckStatus } from '@/lib/seo/audit';
import styles from './stats.module.css';

/**
 * The SEO / answer-engine report for the page the admin is standing on.
 *
 * It does not run on open. An audit is three HTTP requests and a full page
 * render, and firing that every time someone glances at the stats panel would
 * make the panel the most expensive thing on the site. The admin asks for it.
 *
 * Findings are ordered worst first and every one of them carries the reason —
 * the panel is meant to be read once and acted on, not consulted repeatedly to
 * remember what "warn" meant.
 */

const STATUS_ORDER: Record<CheckStatus, number> = { bad: 0, warn: 1, good: 2 };

/*
  An explicit map rather than a class name built by interpolation. A CSS-module
  class reached through a template string is invisible to every tool that
  checks whether the class exists — including the compiler — so it renders
  unstyled and silently the moment the two names drift apart.
*/
const STATUS_CLASS: Record<CheckStatus, string> = {
  good: styles.checkGood,
  warn: styles.checkWarn,
  bad: styles.checkBad,
};

const STATUS_ICON = {
  good: CheckCircle2,
  warn: AlertTriangle,
  bad: XCircle,
} as const;

function scoreClass(value: number): string {
  return value >= 85 ? styles.scoreGood : value >= 60 ? styles.scoreWarn : styles.scoreBad;
}

/** A report, tagged with the page it describes. */
type Report = { key: string; audit: AuditResult | null; error: string | null };

export function SeoAudit({ path, locale }: { path: string; locale: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  /*
    A report belongs to one page. Rather than clearing it when the admin
    navigates, it carries the page it was run for and is only shown while that
    still matches — so findings about a page nobody is looking at can never be
    on screen, and there is no reset to forget.
  */
  const key = `${locale}|${path}`;
  const current = report?.key === key ? report : null;
  const audit = current?.audit ?? null;
  const error = current?.error ?? null;

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/seo/audit?path=${encodeURIComponent(path)}&locale=${encodeURIComponent(locale)}`,
        { credentials: 'same-origin' },
      );
      if (!res.ok) {
        setReport({
          key,
          audit: null,
          error:
            res.status === 429
              ? 'Слишком часто. Подождите минуту.'
              : `Не получилось (ошибка ${res.status}).`,
        });
        return;
      }
      const body = (await res.json()) as { audit: AuditResult };
      setReport({ key, audit: body.audit, error: null });
    } catch {
      setReport({ key, audit: null, error: 'Сеть недоступна.' });
    } finally {
      setLoading(false);
    }
  }, [key, locale, path]);

  return (
    <div className={styles.body}>
      <div className={styles.auditHead}>
        <div>
          <p className={styles.columnTitle}>Анализ страницы</p>
          <code className={styles.auditPath}>
            /{locale}
            {path === '/' ? '' : path}
          </code>
        </div>
        <button type="button" className={styles.runBtn} onClick={() => void run()} disabled={loading}>
          {loading ? <Loader size={14} /> : audit ? <RefreshCw size={14} /> : <Gauge size={14} />}
          {loading ? 'Проверяю…' : audit ? 'Проверить снова' : 'Проверить'}
        </button>
      </div>

      {error ? <p className={styles.note}>{error}</p> : null}

      {!audit && !loading && !error ? (
        <p className={styles.note}>
          Загружает страницу так же, как её видит поисковый робот, и разбирает полученный HTML:
          заголовки, разметку, ссылки, ответ в первом абзаце. Оценивается ровно то, что отдаёт
          сервер, — не то, что дорисовывает браузер.
        </p>
      ) : null}

      {audit ? (
        audit.error ? (
          <p className={styles.note}>{audit.error}</p>
        ) : (
          <>
            <div className={styles.scores}>
              <ScoreTile
                label="SEO"
                value={audit.seoScore}
                hint="Насколько страница пригодна к индексации"
              />
              <ScoreTile
                label="AI"
                value={audit.aiScore}
                hint="Насколько её удобно цитировать ИИ-ответам"
              />
            </div>

            <p className={styles.auditFacts}>
              {audit.facts.words} слов · {audit.facts.headings} заголовков · {audit.facts.images}{' '}
              картинок · {audit.facts.internalLinks} внутренних ссылок · ответ за {audit.ms} мс
              {audit.facts.jsonLdTypes.length
                ? ` · разметка: ${audit.facts.jsonLdTypes.join(', ')}`
                : ''}
            </p>

            <CheckList
              title="Поисковая оптимизация"
              checks={audit.checks.filter((c) => c.group === 'seo')}
            />
            <CheckList
              title="Оптимизация под ИИ-ответы"
              checks={audit.checks.filter((c) => c.group === 'ai')}
            />

            <p className={styles.foot}>
              Оценка — доля пройденных проверок с весами; «частично» считается за половину. Это
              набор общепринятых паттернов, а не гарантия позиций: он говорит, что на странице
              точно мешает, и молчит о том, насколько хорош сам текст.
            </p>
          </>
        )
      ) : null}
    </div>
  );
}

function ScoreTile({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={`${styles.tileValue} ${scoreClass(value)}`}>{value}</span>
      <span className={styles.tileSub}>{hint}</span>
    </div>
  );
}

function CheckList({ title, checks }: { title: string; checks: Check[] }) {
  if (!checks.length) return null;
  const sorted = [...checks].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.weight - a.weight,
  );
  const problems = sorted.filter((c) => c.status !== 'good').length;

  return (
    <div className={styles.column}>
      <p className={styles.columnTitle}>
        {title}
        <span className={styles.columnHint}>
          {problems ? `к исправлению: ${problems}` : 'всё в порядке'}
        </span>
      </p>
      <ul className={styles.checks}>
        {sorted.map((item) => {
          const Icon = STATUS_ICON[item.status];
          return (
            <li key={item.id} className={`${styles.check} ${STATUS_CLASS[item.status]}`}>
              <Icon size={14} className={styles.checkIcon} aria-hidden="true" />
              <div className={styles.checkBody}>
                <p className={styles.checkLabel}>
                  {item.label}
                  <span className={styles.checkFound}>{item.found}</span>
                </p>
                <p className={styles.checkWhy}>{item.why}</p>
                {item.fix ? <p className={styles.checkFix}>{item.fix}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
