# rabbitmatch-landing

Маркетинговый сайт [rabbitmatch.pro](https://rabbitmatch.pro) — платформы для
падела и других ракеточных видов спорта.

Next.js 16 (App Router) · React 19 · TypeScript · CSS Modules · PostgreSQL ·
next-intl. Разворачивается на Railway.

## Быстрый старт

```bash
npm ci
cp .env.example .env.local   # заполнить DATABASE_URL и JWT_SECRET
npm run dev
```

`http://localhost:3000` редиректит на `/en` или `/ru` — локаль определяется по
cookie и `Accept-Language`.

Без живой базы сайт тоже поднимется: слой переопределений контента ловит ошибку
подключения и отдаёт тексты из `messages/*.json`.

## Скрипты

| Команда | Что делает |
|---|---|
| `npm run dev` | Дев-сервер |
| `npm run build` | Продакшен-сборка (`output: 'standalone'`) |
| `npm run lint` | ESLint |
| `npm run create-admin -- email пароль` | Создать/обновить админа CMS |
| `npm run translate` | Доперевести EN → RU через Azure Translator |
| `npm run telegram:webhook set\|info\|delete` | Управление вебхуком бота поддержки |

## Структура сайта

```
/{locale}            обзор и маршрутизация по аудиториям
/{locale}/players    игрокам
/{locale}/organizers организаторам турниров
/{locale}/coaches    тренерам
/{locale}/venues     клубам и владельцам кортов
/{locale}/padel      справочник: что такое падел
/{locale}/pricing    тарифы
/{locale}/faq        сводный FAQ
/{locale}/legal/*    юридические документы
```

Добавление страницы: создать `src/app/[locale]/<путь>/page.tsx` и дописать
маршрут в `routes` в `src/lib/site.ts` — этого достаточно, чтобы страница попала
в `sitemap.xml`, в hreflang-кластер и в `/llms.txt`.

## Документация

| Файл | О чём |
|---|---|
| [`docs/infrastructure.md`](docs/infrastructure.md) | Стек, структура каталогов, БД, API, деплой |
| [`docs/content.md`](docs/content.md) | Откуда взята каждая цифра на сайте и как править тексты |
| [`docs/design-system.md`](docs/design-system.md) | Токены, примитивы, блоки страниц, скриншоты приложения, вертикальный ритм |
| [`docs/screenshots-to-capture.md`](docs/screenshots-to-capture.md) | Какие экраны переснять, чтобы интерфейс на сайте стал русским |
| [`docs/performance.md`](docs/performance.md) | Что ело память на Railway и что с этим сделано |
| [`docs/seo.md`](docs/seo.md) | Локали, canonical/hreflang, JSON-LD, оптимизация под ИИ-поиск |
| [`docs/telegram-chat.md`](docs/telegram-chat.md) | Чат на сайте ↔ Telegram: настройка бота и группы |
| [`docs/auth-and-editing.md`](docs/auth-and-editing.md) | Админ-сессии и правка контента на месте |
| [`docs/page-builder.md`](docs/page-builder.md) | Конструктор: свои секции, медиа и кнопки без правки кода |
| [`docs/i18n-auto-translation.md`](docs/i18n-auto-translation.md) | CI-перевод EN → RU |

## Контент

Все тексты — в `messages/en.json` (источник) и `messages/ru.json`. Русская
версия написана вручную, а не переведена машинно; `messages/.translation-cache.json`
хранит английский оригинал каждого ключа, чтобы ночной джоб не перезаписал
курированный перевод.

Факты на сайте взяты из репозитория приложения
[`dmitriitun/rabbitMatch`](https://github.com/dmitriitun/rabbitMatch). Что откуда
— в [`docs/content.md`](docs/content.md); туда же стоит заглянуть перед тем, как
менять любую цифру.

Любой ключ можно поправить прямо на сайте, войдя админом — правка ложится в
таблицу `content_overrides` и переопределяет JSON без деплоя.
