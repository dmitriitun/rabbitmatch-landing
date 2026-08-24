# Infrastructure

Базовая структура `rabbitmatch.pro` — что где лежит и почему.

## Стек

- Next.js **16.2.6** (App Router, Turbopack по умолчанию)
- React **19.2.4** — async Request APIs (`cookies()`, `headers()`, `params`)
- TypeScript (strict)
- Чистый CSS + CSS Modules (Tailwind не используется)
- PostgreSQL через `pg` (Pool)
- JWT через `jose` + `bcryptjs`
- i18n через `next-intl` 4.x, локаль в URL-сегменте
- Иконки `lucide-react`

## Структура

```
src/
  proxy.ts                  # next-intl middleware (в Next 16 это proxy.ts)
  app/
    layout.tsx              # корневой pass-through; html/body — в [locale]
    globals.css             # токены дизайн-системы + примитивы
    sitemap.ts              # обе локали + hreflang-альтернативы
    robots.ts               # включая явное разрешение ИИ-краулеров
    opengraph-image.tsx     # OG-карточка через next/og
    llms.txt/route.ts       # карта сайта для ИИ-ассистентов
    [locale]/
      layout.tsx            # html/body, шрифт, метаданные, JSON-LD, шелл
      page.tsx              # главная
      players|organizers|coaches|venues|padel|pricing|faq/page.tsx
      legal/[slug]/page.tsx
    api/
      auth/{login,logout,me}/route.ts
      chat/{message,messages}/route.ts
      telegram/webhook/route.ts
      {contact,consent,content,locale,health}/route.ts
  components/
    blocks/                 # серверные блоки страниц (см. design-system.md)
    ChatWidget/             # чат, связанный с Telegram
    AdminEditLayer/         # редактирование контента для админов
    ...
  i18n/
    config.ts               # локали, cookie, список клиентских namespace
    routing.ts              # defineRouting
    navigation.ts           # Link/useRouter с учётом локали
    request.ts              # getRequestConfig
  lib/
    db.ts                   # Pool, query(), авто-миграции
    auth.ts                 # JWT + httpOnly cookie + bcrypt
    auth-shared.ts          # имена cookie, общие с клиентом
    messages.ts             # загрузка каталога + отбор для клиента
    content.ts              # переопределения контента из БД
    chat.ts                 # треды и сообщения чата
    telegram.ts             # клиент Bot API
    site.ts                 # маршруты, URL, ссылки — единый источник
    structured-data.ts      # JSON-LD
    page-meta.ts            # generateMetadata для контентных страниц
    rate-limit.ts
messages/{en,ru}.json
docs/
```

## i18n — локаль в URL

`localePrefix: 'always'`: `/en/...` и `/ru/...`, `/` редиректит на локаль,
определённую по cookie `NEXT_LOCALE` и `Accept-Language`. Дефолт — `en`.

Так сделано по двум причинам сразу: без сегмента поисковик индексирует только
одну языковую версию (см. `docs/seo.md`), и локаль из `cookies()` делает каждую
страницу динамической (см. `docs/performance.md`).

Тексты — в `messages/en.json` и `messages/ru.json`. Любой ключ переопределяется
через таблицу `content_overrides` — это правка контента без деплоя.

**В браузер уезжает не весь каталог**, а только namespace из
`clientNamespaces` (`src/i18n/config.ts`). Добавили клиентский компонент,
который читает новый namespace — допишите его туда, иначе получите
`MISSING_MESSAGE` в консоли браузера.

## База данных и авто-миграции

`DATABASE_URL` (Railway). В `src/lib/db.ts`:

- `Pool` создаётся лениво и кэшируется на `globalThis` — переживает HMR и не
  плодит соединения;
- SSL включается в проде автоматически или при `sslmode=require`; форсируется
  через `PGSSL=1`;
- `ensureMigrated()` идемпотентно создаёт `schema_migrations` и применяет
  неприменённые миграции в транзакции. Флаг «уже мигрировали» лежит на
  `globalThis`, поэтому в рантайме это бесплатно после первого вызова.

| Таблица | Назначение |
|---|---|
| `users` | Админы CMS-наложений |
| `content_overrides` | Правки текста: `(locale, key)` уникальны |
| `contact_requests` | Заявки с формы «Связаться» |
| `cookie_consents` | Журнал согласий на cookie |
| `chat_threads` | Беседы в чате сайта → топики Telegram |
| `chat_messages` | Сообщения чата в обе стороны |

## Аутентификация

`src/lib/auth.ts`:

- `hashPassword` / `verifyPassword` — bcrypt, cost 12;
- `signSession` / `verifySession` — HS256 JWT через `jose`, TTL 7 дней;
- httpOnly-cookie `rm_session` (Secure в проде, SameSite=lax);
- рядом ставится **читаемая** cookie `rm_signed_in`. Она не несёт никаких прав
  и сервером не читается — она лишь сообщает браузеру, что имеет смысл
  спросить `/api/auth/me`. Благодаря ей layout не вызывает `cookies()`, и
  страницы остаются статическими;
- `JWT_SECRET` обязателен и не короче 32 символов.

## API

| Метод | Путь | Что делает |
|---|---|---|
| `POST` | `/api/auth/login` | Проверяет email/пароль, ставит сессию |
| `POST` | `/api/auth/logout` | Чистит cookie |
| `GET` | `/api/auth/me` | Текущая сессия (для клиентского AuthProvider) |
| `GET` / `PUT` | `/api/content` | Чтение и upsert переопределений контента |
| `POST` | `/api/contact` | Заявка с формы |
| `POST` | `/api/consent` | Журналирование согласия на cookie |
| `POST` | `/api/locale` | Ставит cookie `NEXT_LOCALE` |
| `POST` | `/api/chat/message` | Сообщение посетителя → БД → Telegram |
| `GET` | `/api/chat/messages` | Опрос новых сообщений треда |
| `POST` | `/api/telegram/webhook` | Ответы модераторов из Telegram |
| `GET` | `/api/health` | Liveness-проба (БД не трогает) |

## Деплой

`output: 'standalone'`. `nixpacks.toml` собирает и запускает сервер;
`railway.json` дублирует команду запуска (его `startCommand` имеет приоритет)
и указывает healthcheck на `/api/health`.

**`public/` и `.next/static/` докладывает в вывод `postbuild`**
(`scripts/copy-standalone-assets.js`). Standalone-вывод их не содержит: Next
исходит из того, что статику отдаёт CDN. Если их не положить рядом с сервером,
страницы отдаются с кодом 200, а все `/_next/static/*` и `/images/*` — 404, и
сайт приезжает голым текстом без стилей.

Копирование висит именно на `postbuild`, а не отдельным шагом в
`nixpacks.toml`, потому что build-команда, заданная в дашборде Railway,
заменяет фазу сборки из конфига целиком — и шаг молча перестаёт выполняться.

**`HOSTNAME=0.0.0.0` в команде запуска обязателен.** Сгенерированный
`server.js` делает `process.env.HOSTNAME || '0.0.0.0'`, а контейнерный рантайм
— Railway в том числе — выставляет `HOSTNAME` в id контейнера. Next тогда
слушает это имя вместо всех интерфейсов, healthcheck до порта не достучится, и
деплой падает с «service unavailable», а затем «1/1 replicas never became
healthy». Симптом выглядит как проблема приложения, но приложение при этом
исправно.

`healthcheckTimeout` — 300 секунд. Тридцати не хватает: отсчёт идёт от старта
контейнера, а образ около полугигабайта.

Подробности и что выставить в переменных окружения — в `docs/performance.md`.

## Особенности Next.js 16

- **Async Request APIs**: `cookies()`, `headers()`, `params`, `searchParams`
  возвращают Promise — везде `await`.
- **`proxy.ts` вместо `middleware.ts`**: тот же контракт, другое имя файла.
- **Turbopack по умолчанию**: в скриптах `package.json` без `--turbopack`.
- **`serverExternalPackages: ['pg']`**: у pg нативные модули, он не должен
  попадать в бандл.
