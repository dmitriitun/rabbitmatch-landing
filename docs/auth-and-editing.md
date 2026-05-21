# Auth + inline content editing

Лендинг приобретает админский режим: после входа кнопка справа сверху превращается в email-меню, а все обёрнутые тексты — в клик-редактируемые. Изменения хранятся в Postgres и приоритетнее текстов из `messages/*.json`.

## Жизненный цикл

```
visitor → sees: t(key) merged with content_overrides
admin   → sees: same text, but on hover лайм-рамка; click → edit; save → PUT /api/content
              ↓
        content_overrides upsert (locale, key, value)
              ↓
        router.refresh() → getRequestConfig() → loadOverridesAndMerge() → new messages
              ↓
        NextIntlClientProvider re-renders → useTranslations consumers update
```

## БД и миграция

Миграция `0002_is_admin` добавляет в `users` колонку `is_admin BOOLEAN NOT NULL DEFAULT FALSE` (idempotent через `ADD COLUMN IF NOT EXISTS`). Существующие пользователи с `role = 'admin'` получают `is_admin = TRUE`.

Таблица `content_overrides (locale, key, value, updated_by, updated_at)` уже существовала из миграции 0001.

## Создание админа

```bash
DATABASE_URL=postgres://... npm run create-admin -- you@example.com 'super-secret-pass'
```

Под капотом — `tsx scripts/create-admin.ts`. Скрипт идемпотентный: если email уже существует, обновляет пароль и форсит `is_admin = TRUE`.

Регистрации через сайт нет.

## API

| Метод | Путь | Доступ | Что делает |
|---|---|---|---|
| `POST` | `/api/auth/login` | публичный | Проверяет email/пароль, ставит JWT-куки `rm_session`. Тело ответа содержит `{ user: { email, isAdmin } }`. |
| `POST` | `/api/auth/logout` | публичный | Чистит куки. |
| `GET`  | `/api/auth/me` | публичный | Возвращает текущую сессию (`{ user: null }` если не залогинен). |
| `GET`  | `/api/content` | публичный | Все overrides; опциональный `?locale=` для фильтра. |
| `PUT`  | `/api/content` | **только admin** | Upsert `(locale, key, value)`. Возвращает 401 без сессии, 403 если не админ. |

JWT-payload теперь включает `isAdmin: boolean`. `getSession()` восстанавливает его в `SessionPayload.isAdmin`.

## i18n merge

`src/i18n/request.ts` после загрузки JSON-каталога вызывает `loadOverridesAndMerge(locale, base)`:

1. `SELECT key, value FROM content_overrides WHERE locale = $1`.
2. Если ноль строк — возвращает базу как есть (быстрый путь).
3. Иначе делает глубокий clone базы и применяет `applyOverride()` для каждой строки — расщепляет `'pricing.classic.priceMonthlyNew'` на путь и записывает значение в нужный лист, создавая промежуточные узлы при необходимости.
4. При ошибке БД (например, во время `next build` со стабом DSN) — логирует warning в dev и возвращает базу. Это держит сборку зелёной даже без живой БД.

Время вызова — один SELECT за запрос. На страничку с десятками EditableText это всё равно один запрос.

## AuthProvider

`src/components/Providers/AuthProvider.tsx` — клиентский провайдер.

- Получает `initialUser` со стороны `RootLayout` (sync с server `getSession()`), чтобы первый рендер уже знал про админа без мерцания.
- Экспонирует `useAuth()` (бросает, если вне провайдера) и `useAuthOptional()` (возвращает `null`).
- `setUser` — для апдейта после login.
- `logout` — POST `/api/auth/logout`, чистит локальное состояние и делает `router.refresh()`.

`RootLayout` оборачивает `<Header />`, `{children}` и `<Footer />` в `<AuthProvider initialUser={...}>`.

## EditableText

Универсальная обёртка над любым переводимым текстом:

```tsx
<EditableText tKey="hero.title" as="h1" className={styles.title} />
<EditableText tKey="hero.subtitle" as="p" multiline className={styles.subtitle} />
```

Поведение:

- **Не-админ** (`auth.user?.isAdmin !== true`) — рендерит чистый `<Tag>{t(key)}</Tag>`, без дополнительного DOM и без обработчиков. Нулевой вес для публики.
- **Админ, idle** — `role="button"`, лайм-точка-пунктир-рамка на hover/focus, пиктограмма карандаша слева, `title="Click to edit (hero.title)"`. `onClick` / `Enter` / Space → режим редактирования. `e.preventDefault()` + `e.stopPropagation()` — клик не активирует родительские `<a>` / `<button>`.
- **Админ, editing** — рендерит подсвеченный input (или textarea при `multiline`), показывает ключ для ориентира, кнопки Save / Cancel. `Esc` отменяет, `Enter` (не-multiline) или `Cmd/Ctrl+Enter` (multiline) сохраняет.
- **Save** → `PUT /api/content` с `{ key, locale, value }`. Если значение не изменилось — просто закрывает редактор. После успешного ответа `router.refresh()` — RSC перерисовываются с новыми сообщениями.
- **Ошибка сохранения** — inline-метка "Save failed", повтор возможен.

Использует `useTranslations(namespace)` внутри, где namespace — всё до последней точки в `tKey`. Это даёт корректное поведение и в server, и в client дереве (next-intl поддерживает useTranslations в обоих).

## Header / LoginModal

- Заголовок модалки сменён с `Admin sign in / Вход для админов` → `Sign in / Войти` (и подзаголовок — нейтральный `Welcome back`). Снаружи нет упоминаний что вход админский.
- `LoginModal` после успеха зовёт `setUser({ email, isAdmin })` из `AuthProvider` и `router.refresh()` — нет дёрганья окна.
- В Header при `user !== null` вместо «Log in» рендерится `<UserMenu>`: лайм-pill с иконкой `User` и email (обрезается до 22 символов с `…`). Клик открывает дропдаун с полным email и кнопкой Logout. Дропдаун закрывается по Esc и клику вне.

## Где обёрнуто EditableText

Все основные видимые тексты:

| Секция | Ключи |
|---|---|
| Hero | `hero.eyebrow`, `hero.title`, `hero.subtitle`, `hero.stats.*Label` |
| Solution | `solution.eyebrow`, `solution.lead`, `solution.platform`, `solution.items.*`, `solution.aiHighlight` |
| Players | `players.eyebrow`, `players.title`, `players.tournamentsTitle/Body/Highlight`, `players.bookingTitle/Body/Highlight`, `players.controlTitle/Body/Highlight` |
| Launch | `launch.eyebrow`, `launch.title`, `launch.intro1Highlight/Body`, `launch.intro2Highlight/Body`, `launch.step*Title/Body` |
| Comparison | `comparison.title`, `comparison.col*`, `comparison.rows.*`, `comparison.values.*` |
| Pricing | `pricing.title`, `pricing.badgePopular/Ai`, `pricing.monthly/annual/perMonth`, `pricing.{tier}.name/tagline/feature1..7/priceMonthlyOld/New/priceAnnualOld/New` |
| Contact | `contact.eyebrow`, `contact.title`, `contact.lead` |
| Footer | `footer.tagline`, `footer.navTitle/legalTitle`, `footer.privacy/terms` |

Что **не** обёрнуто и почему:

- Названия app-стора (`App Store`, `Google Play`) — это бренды, их менять нельзя.
- Лейблы и плейсхолдеры форм (Name, Email, Message…) — это служебные тексты UI, редактирование пока выглядит как переусложнение. Можно добавить позже одним проходом.
- CTA-кнопки (`Get Started`, `Choose this plan`, `Connect your club for free`) — кнопки имеют собственный onClick (открыть модалку, скроллнуть). Вставить EditableText внутрь сломало бы их основное действие. Их редактирование оставлено через JSON-каталог.
- Текст ошибок/успеха формы — то же, не пользовательский контент.

## Тест полного цикла

Локально (с настоящей `DATABASE_URL`):

1. `npm run create-admin -- me@example.com s3cret-password-please`
2. `npm run dev`
3. Открыть `http://localhost:3000`, кликнуть «Log in», ввести email/пароль. Кнопка превращается в `me@example.com`.
4. Навести курсор на любой обёрнутый текст — пунктирная лайм-рамка + карандаш.
5. Клик → input. Изменить значение → Save. Через ~0.5s текст обновлён.
6. Открыть DevTools → Network: видно `PUT /api/content` (200) и `RSC` payload на refresh с обновлёнными messages.
7. В БД: `SELECT locale, key, value FROM content_overrides WHERE key = 'hero.title';` — строка есть.
8. Открыть страницу в incognito (нет cookie) — текст уже обновлён (override применяется ко всем).
9. Кликнуть на email в Header → Logout → кнопка снова `Log in`, тексты больше не редактируемые.

Без живой БД (как в текущем build-окружении со `DATABASE_URL=stub`) — `loadOverridesAndMerge` ловит ошибку и возвращает базовый JSON, страница рендерится корректно без overrides.
