import 'server-only';
import { loadOverridesAndMerge } from './content';
import { clientNamespaces, type Locale } from '@/i18n/config';

type Messages = Record<string, unknown>;

declare global {
  var __rmBaseMessages: Map<string, Messages> | undefined;
}

function baseCache(): Map<string, Messages> {
  if (!global.__rmBaseMessages) global.__rmBaseMessages = new Map();
  return global.__rmBaseMessages;
}

/**
 * Base catalogue straight from `messages/<locale>.json`, imported once per
 * process. The dynamic import is already module-cached by the bundler; the
 * Map just avoids re-resolving the promise on every request.
 */
async function loadBase(locale: Locale): Promise<Messages> {
  const cache = baseCache();
  const hit = cache.get(locale);
  if (hit) return hit;
  const mod = (await import(`../../messages/${locale}.json`)) as { default: Messages };
  cache.set(locale, mod.default);
  return mod.default;
}

/** Full catalogue (JSON + DB overrides) for server-side `getTranslations`. */
export async function loadMessages(locale: Locale): Promise<Messages> {
  return loadOverridesAndMerge(locale, await loadBase(locale));
}

/**
 * The subset shipped to the browser through `NextIntlClientProvider`.
 *
 * The full RU catalogue is ~115 KB, of which the `legal` namespace alone is
 * ~100 KB — and it was previously inlined into the HTML of every page even
 * though only `/legal/[slug]` reads it. Narrowing to the namespaces client
 * components actually call cuts the per-page payload by roughly an order of
 * magnitude.
 */
export function pickClientMessages(messages: Messages): Messages {
  const out: Messages = {};
  for (const ns of clientNamespaces) {
    if (ns in messages) out[ns] = messages[ns];
  }
  return out;
}
