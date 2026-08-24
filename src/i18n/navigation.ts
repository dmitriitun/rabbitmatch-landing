import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware replacements for `next/link` and the `next/navigation` hooks.
 * `Link href="/players"` resolves to `/en/players` or `/ru/players` based on
 * the active locale, so no component has to build prefixes by hand.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
