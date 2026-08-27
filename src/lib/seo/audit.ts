import 'server-only';
import { locales, localeHreflang, type Locale } from '@/i18n/config';
import {
  jsonLdHas,
  jsonLdTypes,
  linkRel,
  meta,
  parsePage,
  type ParsedPage,
} from './html';

/**
 * On-demand audit of one published page, for search engines and for answer
 * engines.
 *
 * It reads the page the way a crawler does: an HTTP request for the real URL,
 * then the HTML that came back. Not the React tree, not the builder document —
 * the bytes. That is the only version of the page that can be wrong in the
 * ways this is looking for, and auditing anything else would report on a page
 * nobody visits.
 *
 * Two scores rather than one, because the two audiences want different things
 * and a single number hides the trade. A classic SEO checklist is about being
 * *indexable*: one h1, a canonical, a description under 160 characters. An
 * answer engine has already indexed you and is deciding whether to quote you,
 * which rewards a different shape — a direct answer near the top, headings
 * phrased as the questions people actually ask, facts in lists rather than in
 * prose, an explicit last-modified date, and markup that says what the page is
 * without needing JavaScript run.
 *
 * Every finding says what was found, why it matters, and — when it is not
 * already right — what to change. A checklist that only reports pass/fail is a
 * list of things to feel bad about.
 */

export type CheckStatus = 'good' | 'warn' | 'bad';
export type CheckGroup = 'seo' | 'ai';

export type Check = {
  id: string;
  group: CheckGroup;
  /** What was checked, as a short noun phrase. */
  label: string;
  status: CheckStatus;
  /** What is actually on the page right now. */
  found: string;
  /** Why this matters — the reason, not the rule. */
  why: string;
  /** What to change. Absent when the check passed. */
  fix?: string;
  /** How much of the group's score this check carries. */
  weight: number;
};

export type AuditFacts = {
  title: string;
  description: string;
  h1: string;
  words: number;
  headings: number;
  images: number;
  internalLinks: number;
  jsonLdTypes: string[];
  /** Share of the response that is visible text rather than markup, 0–1. */
  textRatio: number;
  bytes: number;
};

export type AuditResult = {
  url: string;
  path: string;
  locale: string;
  fetchedAt: string;
  httpStatus: number;
  ms: number;
  seoScore: number;
  aiScore: number;
  checks: Check[];
  facts: AuditFacts;
  /** Set when the page could not be read at all; `checks` is then empty. */
  error?: string;
};

/* --- Small helpers -------------------------------------------------------- */

/**
 * Does this heading read as a question?
 *
 * The word boundary is a lookahead rather than `\b`, and the flags include
 * `u`. `\b` is defined against `\w`, which is ASCII — so after a Cyrillic word
 * there is no boundary to find, and `/^что\b/` never matches «Что такое падел»
 * at all. This is the kind of bug that reports zero questions on a page that is
 * nothing but questions.
 */
const QUESTION_WORDS =
  /^(что|как|какой|какая|какие|какое|каков|почему|зачем|где|когда|кто|сколько|можно|нужно|нужен|стоит|чем|куда|откуда|what|how|why|when|where|who|which|can|do|does|is|are|should)(?!\p{L})/iu;

function words(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function truncate(value: string, max = 140): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function check(
  group: CheckGroup,
  id: string,
  weight: number,
  label: string,
  status: CheckStatus,
  found: string,
  why: string,
  fix?: string,
): Check {
  return { id, group, label, status, found, why, fix: status === 'good' ? undefined : fix, weight };
}

/** Weighted percentage. `warn` is worth half — it is a real cost, not a pass. */
function score(checks: Check[], group: CheckGroup): number {
  const scoped = checks.filter((c) => c.group === group);
  const total = scoped.reduce((sum, c) => sum + c.weight, 0);
  if (!total) return 0;
  const earned = scoped.reduce(
    (sum, c) => sum + (c.status === 'good' ? c.weight : c.status === 'warn' ? c.weight / 2 : 0),
    0,
  );
  return Math.round((earned / total) * 100);
}

/* --- The checks ----------------------------------------------------------- */

function seoChecks(page: ParsedPage, url: string, path: string): Check[] {
  const out: Check[] = [];
  const title = page.title ?? '';
  const description = meta(page, 'description') ?? '';
  const h1s = page.headings.filter((h) => h.level === 1);
  const canonical = linkRel(page, 'canonical')[0]?.href ?? '';
  const alternates = linkRel(page, 'alternate');

  out.push(
    !title
      ? check('seo', 'title', 10, 'Тег <title>', 'bad', 'отсутствует',
          'Заголовок вкладки — это и есть синяя строка в выдаче. Без него поисковик придумает её сам, обычно из первого попавшегося текста.',
          'Задайте title в generateMetadata этой страницы.')
      : title.length < 25
        ? check('seo', 'title', 10, 'Тег <title>', 'warn', `${title.length} симв.: «${truncate(title, 90)}»`,
            'Короткий заголовок не использует место, которое всё равно вам выделено, и хуже отвечает на запрос.',
            'Доведите до 30–60 символов: тема страницы + бренд.')
        : title.length > 65
          ? check('seo', 'title', 10, 'Тег <title>', 'warn', `${title.length} симв.: «${truncate(title, 90)}»`,
              'Длиннее ~60 символов Google обрезает — важное уезжает за многоточие.',
              'Сократите до 60 символов, главное слово поставьте в начало.')
          : check('seo', 'title', 10, 'Тег <title>', 'good', `${title.length} симв.: «${truncate(title, 90)}»`,
              'Длина в пределах, которые показываются целиком.'),
  );

  out.push(
    !description
      ? check('seo', 'description', 8, 'Meta description', 'bad', 'отсутствует',
          'Описание — это текст под ссылкой в выдаче. Без него туда попадает случайный кусок страницы.',
          'Добавьте description в generateMetadata: одно предложение о том, что человек здесь получит.')
      : description.length < 70
        ? check('seo', 'description', 8, 'Meta description', 'warn', `${description.length} симв.`,
            'Слишком коротко, чтобы объяснить ценность страницы до клика.',
            'Доведите до 120–160 символов.')
        : description.length > 165
          ? check('seo', 'description', 8, 'Meta description', 'warn', `${description.length} симв.`,
              'Хвост длиннее ~160 символов обрезается.',
              'Сократите до 160 символов.')
          : check('seo', 'description', 8, 'Meta description', 'good', `${description.length} симв.`,
              'Показывается целиком.'),
  );

  out.push(
    h1s.length === 1
      ? check('seo', 'h1', 9, 'Заголовок H1', 'good', `«${truncate(h1s[0].text, 90)}»`,
          'Ровно один H1 — однозначная тема страницы.')
      : h1s.length === 0
        ? check('seo', 'h1', 9, 'Заголовок H1', 'bad', 'ни одного',
            'H1 — главный сигнал о теме страницы и для поиска, и для скринридера.',
            'Сделайте главный заголовок H1 (в конструкторе — тип блока «Заголовок H1»).')
        : check('seo', 'h1', 9, 'Заголовок H1', 'bad', `${h1s.length}: ${h1s.map((h) => `«${truncate(h.text, 40)}»`).join(', ')}`,
            'Несколько H1 конкурируют друг с другом: страница как будто про несколько разных вещей.',
            'Оставьте один H1, остальные переведите в H2.'),
  );

  const levels = page.headings.map((h) => h.level);
  let skipped: string | null = null;
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] - levels[i - 1] > 1) {
      skipped = `H${levels[i - 1]} → H${levels[i]}`;
      break;
    }
  }
  out.push(
    page.headings.length < 3
      ? check('seo', 'outline', 6, 'Структура заголовков', 'warn', `${page.headings.length} заголовк(ов)`,
          'Заголовки — оглавление страницы. Их отсутствие превращает текст в сплошное полотно и для человека, и для парсера.',
          'Разбейте текст на разделы с H2, длинные разделы — на H3.')
      : skipped
        ? check('seo', 'outline', 6, 'Структура заголовков', 'warn', `пропуск уровня: ${skipped}`,
            'Пропуск уровня ломает оглавление: непонятно, что чему подчинено.',
            `Замените ${skipped} на последовательный уровень.`)
        : check('seo', 'outline', 6, 'Структура заголовков', 'good',
            `${page.headings.length} заголовков, уровни без пропусков`,
            'Оглавление читается сверху вниз без разрывов.'),
  );

  /*
    Compared by path, not by full URL.

    The canonical is built from the configured production origin, while an
    audit may be run against localhost or a preview deployment. Demanding an
    exact match would report every non-production run as a canonical error —
    which is noise, and worse, noise that trains you to ignore the check. A
    different *path* is the real mistake, and that is still caught.
  */
  const canonicalPath = (() => {
    try {
      return new URL(canonical, url).pathname.replace(/\/$/, '');
    } catch {
      return '';
    }
  })();
  const ownPath = new URL(url).pathname.replace(/\/$/, '');
  const sameOrigin = canonical.startsWith(new URL(url).origin);

  out.push(
    !canonical
      ? check('seo', 'canonical', 7, 'Canonical', 'bad', 'отсутствует',
          'Без canonical один и тот же материал по разным адресам конкурирует сам с собой.',
          'Добавьте alternates.canonical в generateMetadata.')
      : canonicalPath === ownPath
        ? check('seo', 'canonical', 7, 'Canonical', 'good',
            sameOrigin ? canonical : `${canonical} (проверялся ${new URL(url).host})`,
            'Ссылается на саму страницу — правильный вариант. Домен канонической ссылки всегда боевой, даже если проверка шла по другому адресу.')
        : check('seo', 'canonical', 7, 'Canonical', 'warn', canonical,
            'Canonical ведёт на другой путь — эта страница объявлена копией другой.',
            `Если это не так, укажите путь ${ownPath || '/'}.`),
  );

  const langs = new Set(alternates.map((a) => (a.hreflang ?? '').toLowerCase()).filter(Boolean));
  const wanted = [...locales.map((l) => localeHreflang[l].toLowerCase()), 'x-default'];
  const missingLangs = wanted.filter((l) => !langs.has(l));
  out.push(
    missingLangs.length === 0
      ? check('seo', 'hreflang', 6, 'Языковые версии (hreflang)', 'good', [...langs].join(', '),
          'Обе языковые версии и x-default объявлены — они не конкурируют в индексе.')
      : check('seo', 'hreflang', 6, 'Языковые версии (hreflang)', langs.size ? 'warn' : 'bad',
          langs.size ? `есть: ${[...langs].join(', ')}; нет: ${missingLangs.join(', ')}` : 'отсутствуют',
          'Без hreflang русская и английская версии одной страницы выглядят как дубликаты друг друга.',
          'Добавьте alternates.languages для всех локалей и x-default.'),
  );

  const robots = (meta(page, 'robots') ?? '').toLowerCase();
  out.push(
    robots.includes('noindex')
      ? check('seo', 'robots', 10, 'Индексация', 'bad', `meta robots: ${robots}`,
          'Страница явно запрещена к индексации — в поиске её не будет вообще.',
          'Уберите noindex, если страница должна находиться.')
      : check('seo', 'robots', 10, 'Индексация', 'good', robots || 'разрешена (по умолчанию)',
          'Ничто не запрещает индексацию.'),
  );

  const ogMissing = (['og:title', 'og:description', 'og:image'] as const).filter((k) => !meta(page, k));
  out.push(
    ogMissing.length === 0
      ? check('seo', 'og', 5, 'Карточка для соцсетей (OG)', 'good', 'title, description и image заданы',
          'Ссылка на страницу разворачивается в карточку с картинкой — это заметно поднимает переходы из мессенджеров.')
      : check('seo', 'og', 5, 'Карточка для соцсетей (OG)', ogMissing.length === 3 ? 'bad' : 'warn',
          `нет: ${ogMissing.join(', ')}`,
          'Без этих тегов ссылка в Telegram или Facebook выглядит голым URL.',
          'Заполните openGraph в generateMetadata.'),
  );

  const missingAlt = page.images.filter((img) => img.alt === null).length;
  out.push(
    page.images.length === 0
      ? check('seo', 'alt', 5, 'Alt у картинок', 'good', 'картинок нет',
          'Нечего описывать.')
      : missingAlt === 0
        ? check('seo', 'alt', 5, 'Alt у картинок', 'good', `${page.images.length} шт., alt есть у всех`,
            'Alt читают и поиск по картинкам, и скринридеры.')
        : check('seo', 'alt', 5, 'Alt у картинок', missingAlt > page.images.length / 2 ? 'bad' : 'warn',
            `без alt: ${missingAlt} из ${page.images.length}`,
            'Картинка без alt не существует ни для поиска по изображениям, ни для незрячего читателя.',
            'Впишите alt в настройках элемента. Для чисто декоративных — пустой alt="" (это тоже осознанное значение).'),
  );

  const noSize = page.images.filter((img) => !img.width || !img.height).length;
  out.push(
    page.images.length === 0 || noSize === 0
      ? check('seo', 'cls', 4, 'Размеры картинок', 'good',
          page.images.length ? 'width и height заданы' : 'картинок нет',
          'Браузер резервирует место заранее — макет не прыгает при загрузке (это метрика CLS в Core Web Vitals).')
      : check('seo', 'cls', 4, 'Размеры картинок', 'warn', `без width/height: ${noSize} из ${page.images.length}`,
          'Без размеров текст подпрыгивает в момент подгрузки картинки. Это прямо ухудшает CLS, а он входит в оценку страницы.',
          'Загружайте картинки через медиатеку — она записывает размеры; для внешних URL укажите их вручную.'),
  );

  const internal = page.anchors.filter((a) => a.href.startsWith('/') && !a.href.startsWith('//'));
  out.push(
    internal.length >= 3
      ? check('seo', 'links', 5, 'Внутренние ссылки', 'good', `${internal.length} шт.`,
          'Страница встроена в сайт: краулер попадает отсюда дальше, а вес распределяется.')
      : check('seo', 'links', 5, 'Внутренние ссылки', internal.length ? 'warn' : 'bad', `${internal.length} шт.`,
          'Страница-тупик получает мало веса и хуже переобходится.',
          'Добавьте 3–5 ссылок на смежные материалы прямо в тексте.'),
  );

  out.push(
    page.words >= 300
      ? check('seo', 'length', 5, 'Объём текста', 'good', `${page.words} слов`,
          'Достаточно содержания, чтобы страница отвечала на запрос, а не только его называла.')
      : check('seo', 'length', 5, 'Объём текста', page.words >= 120 ? 'warn' : 'bad', `${page.words} слов`,
          'Короткая страница почти всегда проигрывает более полной по тому же запросу.',
          'Доведите основной текст хотя бы до 300–500 слов по существу.'),
  );

  out.push(
    page.lang
      ? check('seo', 'lang', 3, 'Язык страницы', 'good', `<html lang="${page.lang}">`,
          'Язык объявлен — поиск не путает языковые версии, а синтезатор речи читает правильно.')
      : check('seo', 'lang', 3, 'Язык страницы', 'bad', 'атрибут lang не задан',
          'Без него браузер и поиск угадывают язык по тексту.',
          'Задайте lang на <html>.'),
  );

  out.push(
    meta(page, 'viewport')
      ? check('seo', 'viewport', 3, 'Мобильный viewport', 'good', meta(page, 'viewport') ?? '',
          'Страница масштабируется под телефон — обязательное условие мобильной индексации.')
      : check('seo', 'viewport', 3, 'Мобильный viewport', 'bad', 'отсутствует',
          'Google индексирует мобильную версию. Без viewport она нечитаема.',
          'Добавьте viewport в layout.'),
  );

  const depth = path.split('/').filter(Boolean).length;
  out.push(
    depth <= 3 && !/[_A-Z]/.test(path)
      ? check('seo', 'url', 3, 'Адрес страницы', 'good', `${path} (${depth} уровня)`,
          'Короткий адрес из строчных латинских слов — читаемый и стабильный.')
      : check('seo', 'url', 3, 'Адрес страницы', 'warn', `${path} (${depth} уровня)`,
          'Глубокая вложенность и подчёркивания или заглавные буквы в адресе мешают и людям, и краулеру.',
          'Держите не больше трёх уровней, слова разделяйте дефисом, только строчные.'),
  );

  const types = jsonLdTypes(page);
  out.push(
    types.length
      ? check('seo', 'schema', 6, 'Микроразметка Schema.org', 'good', types.join(', '),
          'Разметка даёт право на расширенный сниппет — хлебные крошки, звёзды, раскрывающиеся вопросы.')
      : check('seo', 'schema', 6, 'Микроразметка Schema.org', 'bad', 'JSON-LD не найден',
          'Без разметки страница претендует только на обычную синюю ссылку.',
          'Добавьте JSON-LD: WebPage, BreadcrumbList и, если подходит, FAQPage или Article.'),
  );

  return out;
}

function aiChecks(page: ParsedPage, extras: { llmsTxt: boolean; robotsAllowsAi: boolean }): Check[] {
  const out: Check[] = [];
  const types = jsonLdTypes(page);

  /*
    The lead answer. An answer engine quotes the first self-contained statement
    it finds under the heading, so what matters is whether such a statement
    exists — not the total length of the page.

    "First paragraph" would be the obvious reading and is the wrong one: the
    top of a page is usually an eyebrow ("Гайд") and a label, both of which are
    `<p>` and neither of which is an answer. So this looks for the first
    paragraph long enough to be a sentence, within the opening handful.
  */
  const LEAD_MIN_WORDS = 8;
  const lead =
    [...page.main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .slice(0, 6)
      .map((match) => match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
      .find((text) => words(text) >= LEAD_MIN_WORDS) ?? '';
  const leadWords = words(lead);
  out.push(
    leadWords >= 12 && leadWords <= 70
      ? check('ai', 'lead', 10, 'Прямой ответ в начале', 'good', `${leadWords} слов: «${truncate(lead, 110)}»`,
          'Первый абзац самодостаточен — именно его и цитирует ИИ-ответ, не разбираясь в остальной странице.')
      : check('ai', 'lead', 10, 'Прямой ответ в начале', leadWords ? 'warn' : 'bad',
          leadWords ? `${leadWords} слов: «${truncate(lead, 110)}»` : 'первый абзац не найден',
          'Модель берёт цитату из начала. Если там разгон, вводные слова или пустота, цитировать нечего.',
          'Сразу после заголовка дайте один абзац на 20–50 слов, который отвечает на вопрос страницы целиком, без «в этой статье мы».'),
  );

  /*
    Both `<h2>`+ and `<summary>` count: an accordion question does the same job
    as a question-shaped heading, and on a page whose FAQ is built from
    `<details>` counting only headings reports zero questions on a page that is
    mostly questions.
  */
  const askable = [...page.headings.filter((h) => h.level >= 2).map((h) => h.text), ...page.summaries];
  const questions = askable.filter((text) => QUESTION_WORDS.test(text));
  out.push(
    questions.length >= 2
      ? check('ai', 'questions', 8, 'Заголовки-вопросы', 'good',
          `${questions.length} из ${askable.length}: ${questions.slice(0, 3).map((text) => `«${truncate(text, 40)}»`).join(', ')}`,
          'Заголовок, сформулированный как вопрос, совпадает с самим запросом — такой блок находят и цитируют целиком.')
      : check('ai', 'questions', 8, 'Заголовки-вопросы', questions.length ? 'warn' : 'bad',
          `${questions.length} из ${askable.length}`,
          'ИИ сопоставляет вопрос пользователя с заголовками. «Особенности» не совпадает ни с одним живым вопросом, «Чем падел отличается от тенниса» — совпадает.',
          'Переформулируйте 2–4 подзаголовка в вопросы, которыми люди реально спрашивают.'),
  );

  /*
    Chunk size is measured against real headings only. An accordion question
    counts as a question above, but an FAQ answer is two sentences by design —
    folding those into the average makes a well-proportioned page look like a
    page chopped into fragments.
  */
  const subHeads = page.headings.filter((h) => h.level >= 2).length;
  const perSection = subHeads ? Math.round(page.words / Math.max(1, subHeads)) : page.words;
  out.push(
    subHeads >= 2 && perSection >= 40 && perSection <= 400
      ? check('ai', 'chunks', 7, 'Размер смысловых блоков', 'good', `~${perSection} слов на раздел`,
          'Страница нарезается на куски, каждый из которых понятен отдельно — так её и индексируют модели.')
      : check('ai', 'chunks', 7, 'Размер смысловых блоков', subHeads ? 'warn' : 'bad',
          subHeads ? `~${perSection} слов на раздел при ${subHeads} подзаголовках` : 'подзаголовков нет',
          'Модель режет страницу на фрагменты по заголовкам. Слишком длинный раздел теряет контекст при нарезке, слишком короткий не несёт факта.',
          'Держите 100–300 слов между подзаголовками.'),
  );

  out.push(
    page.lists + page.tables >= 2
      ? check('ai', 'structure', 6, 'Списки и таблицы', 'good', `списков: ${page.lists}, таблиц: ${page.tables}`,
          'Факты в списке извлекаются однозначно, в отличие от тех же фактов внутри абзаца.')
      : check('ai', 'structure', 6, 'Списки и таблицы', page.lists + page.tables ? 'warn' : 'bad',
          `списков: ${page.lists}, таблиц: ${page.tables}`,
          'Перечисление, размазанное по тексту, модель может пересказать неполно или перепутать порядок.',
          'Правила, шаги и сравнения выносите в маркированный список или таблицу.'),
  );

  out.push(
    types.length >= 2
      ? check('ai', 'entities', 7, 'Разметка сущностей', 'good', types.join(', '),
          'Разметка прямо называет, что это за страница и о чём она, — модели не приходится это выводить из текста.')
      : check('ai', 'entities', 7, 'Разметка сущностей', types.length ? 'warn' : 'bad',
          types.length ? types.join(', ') : 'нет',
          'JSON-LD — единственное место, где смысл страницы записан машиночитаемо. Без него всё держится на угадывании по тексту.',
          'Добавьте как минимум WebPage + BreadcrumbList, для статьи — Article, для блока вопросов — FAQPage.'),
  );

  out.push(
    jsonLdHas(page, 'dateModified') || jsonLdHas(page, 'datePublished')
      ? check('ai', 'freshness', 6, 'Дата обновления', 'good', 'указана в JSON-LD',
          'Явная дата — сильный аргумент при выборе между двумя источниками об одном и том же.')
      : check('ai', 'freshness', 6, 'Дата обновления', 'warn', 'не указана',
          'При прочих равных ИИ цитирует то, что датировано и свежее. Недатированное выглядит устаревшим.',
          'Добавьте datePublished и dateModified в разметку Article.'),
  );

  out.push(
    types.includes('FAQPage') || types.includes('HowTo') || types.includes('QAPage')
      ? check('ai', 'qa', 5, 'Вопросы и ответы в разметке', 'good',
          types.filter((t) => ['FAQPage', 'HowTo', 'QAPage'].includes(t)).join(', '),
          'Пары «вопрос — ответ» размечены явно: это самый цитируемый формат.')
      : check('ai', 'qa', 5, 'Вопросы и ответы в разметке', 'warn', 'FAQPage / HowTo не найдены',
          'Блок вопросов без разметки — обычный текст, который ещё надо распознать.',
          'Если на странице есть вопросы или пошаговая инструкция, разметьте их FAQPage или HowTo.'),
  );

  const realHeadings = page.headings.filter((h) => h.level >= 2).length;
  const headingsWithId = page.headings.filter((h) => h.level >= 2 && h.id).length;
  out.push(
    realHeadings === 0 || headingsWithId >= Math.ceil(realHeadings / 2)
      ? check('ai', 'anchors', 5, 'Якоря у заголовков', 'good', `${headingsWithId} из ${realHeadings}`,
          'На конкретный раздел можно сослаться напрямую — цитата ведёт в нужное место, а не на начало страницы.')
      : check('ai', 'anchors', 5, 'Якоря у заголовков', 'warn', `${headingsWithId} из ${realHeadings}`,
          'Без id у заголовка ссылка ведёт на верх страницы, и читателю приходится искать нужный абзац глазами.',
          'Задайте якорь секции в настройках — он становится id и ссылкой вида #anchor.'),
  );

  const density = page.html.length ? page.text.length / page.html.length : 0;
  out.push(
    density >= 0.05
      ? check('ai', 'density', 5, 'Текст без JavaScript', 'good', `${Math.round(density * 100)}% ответа — видимый текст`,
          'Содержимое приходит уже в HTML: краулеры ИИ обычно не выполняют скрипты, и им достаточно первого ответа сервера.')
      : check('ai', 'density', 5, 'Текст без JavaScript', 'warn', `${Math.round(density * 100)}% ответа — видимый текст`,
          'Если текста в исходном HTML почти нет, значит его дорисовывает браузер — а большинство ИИ-краулеров этого не делают и видят пустую страницу.',
          'Проверьте, что основной контент рендерится на сервере.'),
  );

  const semantic = Object.entries(page.landmarks).filter(([, present]) => present).length;
  out.push(
    page.landmarks.main && semantic >= 4
      ? check('ai', 'semantics', 4, 'Семантические теги', 'good',
          Object.entries(page.landmarks).filter(([, v]) => v).map(([k]) => `<${k}>`).join(' '),
          'Разметка сама говорит, где основное содержимое, а где навигация и подвал.')
      : check('ai', 'semantics', 4, 'Семантические теги', 'warn',
          `<main>: ${page.landmarks.main ? 'есть' : 'нет'}, ориентиров: ${semantic}`,
          'Без <main> парсеру приходится угадывать, что здесь контент, а что обвязка, — и в цитату попадает меню.',
          'Оберните содержимое в <main>, разделы — в <section>, статью — в <article>.'),
  );

  out.push(
    extras.llmsTxt
      ? check('ai', 'llms', 5, 'Файл /llms.txt', 'good', 'доступен',
          'Карта сайта в прозе: прямо сообщает ассистентам, о чём этот сайт и какая страница за что отвечает.')
      : check('ai', 'llms', 5, 'Файл /llms.txt', 'warn', 'не отвечает',
          'Несколько ассистентов читают /llms.txt как краткое описание сайта. Это дёшево и никому не мешает.',
          'Отдавайте /llms.txt со списком разделов и одним предложением о каждом.'),
  );

  out.push(
    extras.robotsAllowsAi
      ? check('ai', 'robotstxt', 5, 'Доступ ИИ-краулеров', 'good', 'robots.txt их не блокирует',
          'GPTBot, ClaudeBot и PerplexityBot могут читать сайт — иначе цитировать нечего.')
      : check('ai', 'robotstxt', 5, 'Доступ ИИ-краулеров', 'bad', 'robots.txt запрещает ИИ-ботов',
          'Запрет в robots.txt означает, что сайта для ИИ-ответов просто не существует.',
          'Уберите Disallow для GPTBot / ClaudeBot / PerplexityBot, если хотите попадать в ответы.'),
  );

  return out;
}

/* --- Entry point ---------------------------------------------------------- */

/** Ten seconds is longer than any page here takes and shorter than a hung fetch. */
const TIMEOUT_MS = 10_000;

async function get(url: string): Promise<{ status: number; body: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      // Ask for the page the way a crawler would, and never from a cache: an
      // audit of a stale copy is worse than no audit.
      headers: { 'user-agent': 'RabbitMatchSeoAudit/1.0', accept: 'text/html,text/plain,*/*' },
      cache: 'no-store',
      redirect: 'follow',
    });
    return { status: res.status, body: await res.text() };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const AI_CRAWLERS = new Set([
  'gptbot',
  'oai-searchbot',
  'chatgpt-user',
  'claudebot',
  'claude-web',
  'claude-searchbot',
  'perplexitybot',
  'google-extended',
]);

/**
 * Do the AI crawlers we care about have a `Disallow: /` waiting for them?
 *
 * Groups the file the way the spec does: consecutive `User-agent` lines share
 * one group, and the group ends at the first `User-agent` that follows a rule.
 * Only a blanket `Disallow: /` counts — a path-specific rule is a decision
 * about that path, not about the site.
 */
function robotsAllowsAi(robots: string): boolean {
  if (!robots.trim()) return true;

  let agents: string[] = [];
  let collectingAgents = true;

  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.split('#')[0].trim().toLowerCase();
    if (!line) continue;

    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();

    if (field === 'user-agent') {
      if (!collectingAgents) {
        agents = [];
        collectingAgents = true;
      }
      agents.push(value);
      continue;
    }

    collectingAgents = false;
    if (field === 'disallow' && value === '/' && agents.some((agent) => AI_CRAWLERS.has(agent))) {
      return false;
    }
  }

  return true;
}

export async function auditPage(origin: string, locale: Locale, path: string): Promise<AuditResult> {
  const clean = path === '/' ? '' : path;
  const url = `${origin}/${locale}${clean}`;
  const started = Date.now();

  const [page, llms, robots] = await Promise.all([
    get(url),
    get(`${origin}/llms.txt`),
    get(`${origin}/robots.txt`),
  ]);

  const ms = Date.now() - started;
  const fetchedAt = new Date().toISOString();

  const emptyFacts: AuditFacts = {
    title: '',
    description: '',
    h1: '',
    words: 0,
    headings: 0,
    images: 0,
    internalLinks: 0,
    jsonLdTypes: [],
    textRatio: 0,
    bytes: 0,
  };

  if (!page || page.status >= 400) {
    return {
      url,
      path,
      locale,
      fetchedAt,
      httpStatus: page?.status ?? 0,
      ms,
      seoScore: 0,
      aiScore: 0,
      checks: [],
      facts: emptyFacts,
      error: page
        ? `Страница ответила ${page.status}.`
        : 'Страница не ответила — проверьте, что сайт доступен по этому адресу.',
    };
  }

  const parsed = parsePage(page.body);
  const checks = [
    ...seoChecks(parsed, url, path),
    ...aiChecks(parsed, {
      llmsTxt: !!llms && llms.status < 400 && llms.body.trim().length > 40,
      robotsAllowsAi: robotsAllowsAi(robots?.status === 200 ? robots.body : ''),
    }),
  ];

  return {
    url,
    path,
    locale,
    fetchedAt,
    httpStatus: page.status,
    ms,
    seoScore: score(checks, 'seo'),
    aiScore: score(checks, 'ai'),
    checks,
    facts: {
      title: parsed.title ?? '',
      description: meta(parsed, 'description') ?? '',
      h1: parsed.headings.find((h) => h.level === 1)?.text ?? '',
      words: parsed.words,
      headings: parsed.headings.length,
      images: parsed.images.length,
      internalLinks: parsed.anchors.filter((a) => a.href.startsWith('/') && !a.href.startsWith('//'))
        .length,
      jsonLdTypes: jsonLdTypes(parsed),
      textRatio: page.body.length ? parsed.text.length / page.body.length : 0,
      bytes: page.body.length,
    },
  };
}
