import 'server-only';

/**
 * Just enough HTML reading to audit a page.
 *
 * No parser dependency. The audit asks a dozen structural questions — how many
 * `h1`s, do the images have `alt`, is there a canonical, what JSON-LD types are
 * declared — and every one of them is answerable from the markup with a
 * tokenising pass. Pulling in a full DOM implementation to answer them would
 * cost more in install size and cold-start than the whole feature.
 *
 * The trade is that this is *lenient*, not correct: it will mis-read markup
 * that a browser would also struggle with (an unquoted attribute containing
 * `>`, a comment inside an attribute value). That is acceptable here because
 * the input is our own server-rendered output, not arbitrary pages, and
 * because the worst case is one check reading `warn` when it should read
 * `good` — a wrong hint, not a wrong page.
 */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  laquo: '«',
  raquo: '»',
  mdash: '—',
  ndash: '–',
  hellip: '…',
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body: string) => {
    if (body.startsWith('#')) {
      const code = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/** Attributes of one start tag, lowercased keys, entity-decoded values. */
export function tagAttrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;
  // Skip the tag name itself.
  const body = tag.replace(/^<\s*[a-zA-Z][-a-zA-Z0-9]*/, '');
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    out[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return out;
}

/** Every start tag of one element name, as raw strings. */
export function findTags(html: string, name: string): string[] {
  const re = new RegExp(`<${name}\\b[^>]*>`, 'gi');
  return html.match(re) ?? [];
}

/** Content of the first `<name>…</name>`, tags stripped. */
export function firstText(html: string, name: string): string | null {
  const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i');
  const m = re.exec(html);
  return m ? textOf(m[1]) : null;
}

export function stripNoise(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

/** Visible text of a markup fragment. */
export function textOf(fragment: string): string {
  return decodeEntities(stripNoise(fragment).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export type Heading = { level: number; text: string; id: string | null };

export function headings(html: string): Heading[] {
  const out: Heading[] = [];
  const re = /<(h[1-6])\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const text = textOf(match[3]);
    if (!text) continue;
    out.push({
      level: Number(match[1][1]),
      text,
      id: tagAttrs(`<${match[1]}${match[2]}>`).id || null,
    });
  }
  return out;
}

export type ParsedPage = {
  html: string;
  head: string;
  /** `<main>` when the page has one, the body otherwise. */
  main: string;
  text: string;
  words: number;
  lang: string | null;
  title: string | null;
  metas: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  anchors: Array<{ href: string; text: string; rel: string | null }>;
  images: Array<{ src: string; alt: string | null; width: string | null; height: string | null }>;
  headings: Heading[];
  /**
   * `<summary>` text.
   *
   * An accordion question is a heading in every sense that matters to a reader
   * or to an answer engine — it names what the block below it answers — and on
   * this site the FAQ is built from `<details>`, so leaving these out made a
   * page full of questions look like a page with none.
   */
  summaries: string[];
  jsonLd: unknown[];
  /** Whether the markup uses each landmark element. */
  landmarks: Record<'main' | 'article' | 'section' | 'nav' | 'header' | 'footer' | 'aside', boolean>;
  lists: number;
  tables: number;
};

function section(html: string, name: string): string | null {
  const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*)<\\/${name}>`, 'i');
  const m = re.exec(html);
  return m ? m[1] : null;
}

export function parsePage(html: string): ParsedPage {
  const head = section(html, 'head') ?? '';
  const body = section(html, 'body') ?? html;
  const main = section(body, 'main') ?? body;

  const metas = findTags(head || html, 'meta').map(tagAttrs);
  const linkTags = findTags(head || html, 'link').map(tagAttrs);

  const anchors: ParsedPage['anchors'] = [];
  const anchorRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(body)) !== null) {
    const attrs = tagAttrs(`<a${match[1]}>`);
    if (!attrs.href) continue;
    anchors.push({ href: attrs.href, text: textOf(match[2]), rel: attrs.rel ?? null });
  }

  const images = findTags(body, 'img').map((tag) => {
    const attrs = tagAttrs(tag);
    return {
      src: attrs.src ?? '',
      // `alt=""` is a decision (decorative); a missing attribute is an omission.
      alt: 'alt' in attrs ? attrs.alt : null,
      width: attrs.width ?? null,
      height: attrs.height ?? null,
    };
  });

  const jsonLd: unknown[] = [];
  const ldRe = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((match = ldRe.exec(html)) !== null) {
    try {
      jsonLd.push(JSON.parse(match[1].trim()));
    } catch {
      /* a block we cannot parse is reported by the check that counts them */
    }
  }

  const mainText = textOf(main);

  return {
    html,
    head,
    main,
    text: mainText,
    words: mainText ? mainText.split(/\s+/).length : 0,
    lang: tagAttrs(findTags(html, 'html')[0] ?? '<html>').lang || null,
    title: firstText(head || html, 'title'),
    metas,
    links: linkTags,
    anchors,
    images,
    headings: headings(body),
    summaries: [...body.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi)]
      .map((m) => textOf(m[1]))
      .filter(Boolean),
    jsonLd,
    landmarks: {
      main: /<main\b/i.test(body),
      article: /<article\b/i.test(body),
      section: /<section\b/i.test(body),
      nav: /<nav\b/i.test(body),
      header: /<header\b/i.test(body),
      footer: /<footer\b/i.test(body),
      aside: /<aside\b/i.test(body),
    },
    lists: (main.match(/<(ul|ol)\b/gi) ?? []).length,
    tables: (main.match(/<table\b/gi) ?? []).length,
  };
}

/** `<meta name="…">` / `<meta property="…">`, whichever the page used. */
export function meta(page: ParsedPage, key: string): string | null {
  const wanted = key.toLowerCase();
  for (const attrs of page.metas) {
    const name = (attrs.name ?? attrs.property ?? attrs.itemprop ?? '').toLowerCase();
    if (name === wanted) return attrs.content ?? '';
  }
  return null;
}

export function linkRel(page: ParsedPage, rel: string): Array<Record<string, string>> {
  const wanted = rel.toLowerCase();
  return page.links.filter((attrs) => (attrs.rel ?? '').toLowerCase().split(/\s+/).includes(wanted));
}

/** Every `@type` mentioned anywhere in the page's JSON-LD, flattened. */
export function jsonLdTypes(page: ParsedPage): string[] {
  const found = new Set<string>();
  const walk = (value: unknown, depth: number): void => {
    if (depth > 6 || !value) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }
    if (typeof value !== 'object') return;
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (key === '@type') {
        if (typeof inner === 'string') found.add(inner);
        else if (Array.isArray(inner)) for (const t of inner) if (typeof t === 'string') found.add(t);
      } else {
        walk(inner, depth + 1);
      }
    }
  };
  walk(page.jsonLd, 0);
  return [...found].sort();
}

/** Depth-first search for one property anywhere in the JSON-LD graph. */
export function jsonLdHas(page: ParsedPage, property: string): boolean {
  let seen = false;
  const walk = (value: unknown, depth: number): void => {
    if (seen || depth > 6 || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (key === property && inner) {
        seen = true;
        return;
      }
      walk(inner, depth + 1);
    }
  };
  walk(page.jsonLd, 0);
  return seen;
}
