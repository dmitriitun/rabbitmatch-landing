import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import styles from './tree.module.css';

/**
 * The trail from the home page down to the current one.
 *
 * On a knowledge base this is navigation, not decoration: an article three
 * levels down is usually entered from search, and without the trail the
 * visitor has no way to discover the section it belongs to — which is the
 * page that holds the other twenty articles they might read next.
 *
 * The machine-readable copy is emitted separately as `BreadcrumbList` JSON-LD
 * by the page, which is what turns the trail into the path shown under the
 * result in search.
 */
export function Breadcrumbs({
  trail,
  label,
}: {
  /** Home first, current page last. The last entry renders as plain text. */
  trail: ReadonlyArray<{ name: string; path: string }>;
  label: string;
}) {
  if (trail.length < 2) return null;

  return (
    <nav className={styles.crumbs} aria-label={label}>
      <ol className={styles.crumbList}>
        {trail.map((item, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={item.path} className={styles.crumb}>
              {last ? (
                <span aria-current="page" className={styles.crumbCurrent}>
                  {item.name}
                </span>
              ) : (
                <>
                  <Link href={item.path} className={styles.crumbLink}>
                    {item.name}
                  </Link>
                  <ChevronRight size={13} aria-hidden="true" className={styles.crumbSep} />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
