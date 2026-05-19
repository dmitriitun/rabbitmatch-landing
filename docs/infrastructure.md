# Infrastructure

The base scaffolding for `rabbitmatch.pro` landing — what runs where, and why.

## Stack

- Next.js **16.2.6** (App Router, Turbopack по умолчанию)
- React **19.2.4** — async Request APIs (`cookies()`, `headers()`, `params`)
- TypeScript (strict)
- Чистый CSS + CSS Modules (Tailwind не используется)
- PostgreSQL через `pg` (Pool)
- JWT через `jose` + хеширование паролей `bcryptjs`
- i18n через `next-intl` 4.x
- Иконки `lucide-react`

## Directory layout

```
src/
  app/
    layout.tsx          # Корневой layout: тёмная тема, Inter, NextIntlClientProvider
    page.tsx            # Главная (плейсхолдеры секций)
    globals.css         # CSS-переменные дизайн-системы, ресет
    page.module.css     # Стили главной
    api/
      auth/login/route.ts
      auth/logout/route.ts
      content/route.ts
      contact/route.ts
      locale/route.ts
  i18n/
    config.ts           # Поддерживаемые локали, имя cookie
    request.ts          # next-intl getRequestConfig (cookie + Accept-Language)
  lib/
    db.ts               # Pool, query(), withClient(), авто-миграции
    auth.ts             # JWT + httpOnly cookie + bcrypt
messages/
  en.json
  ru.json
docs/
  infrastructure.md     # этот файл
```

## i18n — почему без `[locale]` сегмента

`next-intl` поддерживает два режима: с маршрутизацией по сегменту (`/en`, `/ru`) и без неё. Для лендинга выбран режим **без `[locale]`-сегмента**:

- URL остаётся «чистым» (`rabbitmatch.pro/`), без редиректов.
- Локаль выбирается так: `NEXT_LOCALE` cookie → `Accept-Language` → `en` по умолчанию.
- Cookie ставится через `POST /api/locale` — это поведение, которое включается, когда пользователь явно выбирает язык в UI.
- Конфигурация загружается в `src/i18n/request.ts`, подключается через `next.config.ts` плагином `createNextIntlPlugin('./src/i18n/request.ts')`.

Тексты в `messages/en.json` и `messages/ru.json`. Любой ключ можно переопределить через `content_overrides` в БД (см. ниже) — это даст редактирование контента без деплоя.

## База данных и авто-миграции

Подключение управляется через `DATABASE_URL` (Railway). В `src/lib/db.ts`:

- `Pool` создаётся лениво и кэшируется на `globalThis`, чтобы пережить HMR в dev и не плодить соединения.
- SSL включается автоматически в продакшене или если в `DATABASE_URL` есть `sslmode=require` (поведение Railway). Принудительно — `PGSSL=1`.
- Авто-миграции: `ensureMigrated()` идемпотентно создаёт таблицу `schema_migrations`, затем по очереди применяет неприменённые миграции в транзакции. Состояние «уже мигрировали» хранится в `globalThis.__rmMigrationsApplied`, поэтому в рантайме это бесплатно после первого вызова. `query()` и `withClient()` сами вызывают `ensureMigrated()`.

Текущая миграция `0001_init` создаёт:

| Таблица | Назначение |
|---|---|
| `users` | Админы CMS-наложений. Поля: `id`, `email` (уник.), `password_hash`, `role`, таймстемпы. |
| `content_overrides` | Локализуемые правки текста сайта: `(locale, key)` уник., `value`, `updated_by`, `updated_at`. |
| `contact_requests` | Заявки с формы «Связаться»: имя, email, сообщение, локаль, источник, IP, User-Agent, время. Индекс по `created_at DESC`. |

## Аутентификация

`src/lib/auth.ts` инкапсулирует всё:

- `hashPassword` / `verifyPassword` через `bcryptjs` (cost = 12).
- `signSession` / `verifySession` — HS256 JWT через `jose`. TTL 7 дней.
- `setSessionCookie` / `clearSessionCookie` / `getSession` — работают с httpOnly cookie `rm_session` (Secure в проде, SameSite=lax).
- `JWT_SECRET` обязателен и должен быть не короче 32 символов — иначе модуль кидает ошибку при первой подписи/проверке.

## API-скелет

| Метод | Путь | Что делает |
|---|---|---|
| `POST` | `/api/auth/login` | Проверяет email/password, ставит сессионную cookie. |
| `POST` | `/api/auth/logout` | Чистит cookie. |
| `GET` | `/api/content` | Возвращает все `content_overrides`, опционально фильтрует `?locale=`. |
| `PUT` | `/api/content` | Upsert одной записи `(locale, key, value)`. Требует сессию. |
| `POST` | `/api/contact` | Валидирует и сохраняет заявку с формы «Связаться» (с IP и UA из заголовков). |
| `POST` | `/api/locale` | Ставит cookie `NEXT_LOCALE` на год. |

Все обработчики — Route Handlers нового App Router (`route.ts`), используют Web `Request`/`Response` и `NextResponse`. `cookies()` и `headers()` вызываются как `await` (Next.js 16 — async Request APIs).

## Дизайн-система

CSS-переменные объявлены в `src/app/globals.css` под `:root` и применяются глобально. Никаких CSS-in-JS, никаких UI-фреймворков — только CSS Modules для скоупа.

| Переменная | Значение |
|---|---|
| `--color-bg` | `#0A0A0A` |
| `--color-lime` | `#B9E901` |
| `--color-purple` | `#4300BD` |
| `--color-text` | `#FFFFFF` |
| `--color-text-muted` | `#6B7280` |
| `--color-text-faint` | `#9CA3AF` |
| `--color-border` | `#E5E7EB` |
| `--color-danger` | `#EF4444` |
| `--color-warning` | `#FF7300` |
| `--radius-{sm,md,lg,xl,pill}` | 8 / 12 / 16 / 24 / 999 |
| `--space-*` | 4-pt шаговый scale |
| `--ease-out`, `--duration-*` | базовый motion-словарь |

Шрифт — `Inter` через `next/font/google` с latin + cyrillic подмножествами.

## Environment variables

См. `.env.example`. Публичные (доступны клиенту через `process.env.NEXT_PUBLIC_*`):

- `NEXT_PUBLIC_APP_URL` — каноничный URL (используется в `metadataBase`).
- `NEXT_PUBLIC_IOS_URL`, `NEXT_PUBLIC_GOOGLE_PLAY_URL`, `NEXT_PUBLIC_TELEGRAM_APP_URL` — ссылки на сторы.
- `NEXT_PUBLIC_CONTACT_TELEGRAM`, `NEXT_PUBLIC_CONTACT_EMAIL` — контакты.
- `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_TIKTOK_URL`, `NEXT_PUBLIC_FACEBOOK_URL`, `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` — соцсети.

Серверные:

- `DATABASE_URL` — PostgreSQL DSN.
- `PGSSL` — `1` чтобы форсить SSL.
- `JWT_SECRET` — ≥ 32 символов.

## Notes on Next.js 16 specifics

- **Async Request APIs:** `cookies()`, `headers()`, `params`, `searchParams` теперь возвращают Promise — в коде используем `await`.
- **`proxy.ts` вместо `middleware.ts`:** пока не требуется, локаль определяется на уровне `getRequestConfig`.
- **Turbopack по умолчанию:** скрипты в `package.json` без `--turbopack`.
- **`serverExternalPackages: ['pg']`** в `next.config.ts` — pg использует нативные модули, не должен попадать в бандл.
