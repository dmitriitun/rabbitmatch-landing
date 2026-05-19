# Header & Hero

Первые видимые секции лендинга и связанная клиентская инфраструктура.

## Дерево компонентов

```
src/components/
  Header/
    Header.tsx                 (client) — sticky + blur, nav, lang, login, CTA, бургер
    Header.module.css
  LoginModal/
    LoginModal.tsx             (client) — модалка входа, focus trap, Esc, body lock
    LoginModal.module.css
  LanguageSwitcher/
    LanguageSwitcher.tsx       (client) — EN/RU, POST /api/locale, router.refresh()
    LanguageSwitcher.module.css
  Hero/
    Hero.tsx                   (server) — заголовок, подзаголовок, блобы, грид
    HeroCta.tsx                (client) — кнопка приложения с haptic-фидбеком
    Hero.module.css
  AnimatedCounter/
    AnimatedCounter.tsx        (client) — счётчик в Hero stats
  icons/
    TelegramIcon.tsx           (server) — inline SVG, лейбла нет в lucide
src/lib/
  haptics.ts                   — обёртка над navigator.vibrate (no-op на десктопе)
```

## Header

- **Sticky + blur:** `position: sticky; top: 0`, `backdrop-filter: blur(14px) saturate(140%)`. После `scrollY > 8` фон становится плотнее и появляется нижняя граница — состояние подсвечивает, что страница прокручена.
- **Логотип:** `/images/logo.png` (исходный файл с диска пользователя). 36×36, рядом текст `RabbitMatch`. Клик → smooth scroll к `#hero`.
- **Навигация (≥768px):** Features → `#features`, For Clubs → `#crm`, Pricing → `#pricing`, Contact → `#contact`. Через `Element.scrollIntoView({ behavior: 'smooth' })`.
- **LanguageSwitcher (компактный):** pill-segmented `EN | RU`. Кладёт cookie `NEXT_LOCALE` через `POST /api/locale` и делает `router.refresh()` — RSC перерисовываются с новой локалью без полной перезагрузки.
- **Кнопка входа:** компактный `LogIn`-чип (иконка из lucide) → открывает `LoginModal`.
- **CTA «Get Started»:** лайм-пилюля → smooth scroll к `#contact`, с hover-glow.
- **Мобильный режим (<768px):** скрываем `nav`, `loginBtn`, `cta` и показываем гамбургер. По клику выезжает sheet справа (`transform: translateX`), внутри: ссылки, переключатель языка, login и крупная CTA. `body` блокируется от прокрутки, пока меню открыто.

## LoginModal

Открывается только когда `loginOpen === true` — родитель условно монтирует компонент, поэтому при закрытии стейт формы сбрасывается естественно через unmount (без эффектов с `setState`, которые валит правило `react-hooks/set-state-in-effect` в React 19.2).

- Backdrop с `backdrop-filter: blur` и затемнением, клик по фону → закрытие.
- Focus переводится на первое поле при монтировании, при размонтировании возвращается на элемент, открывший модалку.
- Esc → закрытие; пока открыта, `body.overflow = hidden`.
- Поля: email + пароль, иконки `Mail` и `Lock` слева. `POST /api/auth/login`. Ошибка показывается в красном `errorBox`.
- Кнопка submit с loader-иконкой и состоянием «submitting».

## Hero

- **Фон:** два `radial-gradient` блоба (лайм и фиолетовый) с `filter: blur(80px)`, оба анимируются `transform`-кейфреймами (14s/18s ease-in-out infinite). Поверх — едва заметная точечная сетка с radial-маской — добавляет глубины. Оба слоя `pointer-events: none` и `aria-hidden`. При `prefers-reduced-motion: reduce` анимация блобов отключается.
- **Контент:** eyebrow-чип (`Racket sports, organized`), большой `clamp(40px, 8vw, 88px)` градиентный заголовок с `text-wrap: balance`, подзаголовок 16–19px.
- **App-кнопки:** 4 шт. (App Store, Google Play, Web App, Telegram). На мобильных — одна колонка, ≥560px — 2 колонки, ≥900px — 4 в ряд. Ссылки берутся из `NEXT_PUBLIC_IOS_URL`, `NEXT_PUBLIC_GOOGLE_PLAY_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_TELEGRAM_APP_URL`. Если URL пустой — кнопка рендерится как `<span aria-disabled>` (визуально dimmed, не кликабельна).
- **Stats:** 4 карточки с `backdrop-filter: blur`, ховер поднимает карточку на 2px и подсвечивает лайм-бордером. Числовые значения проходят через `AnimatedCounter`.

## AnimatedCounter

Регулярка `/^(\D*)(\d+)(\D*)$/` отделяет числовую часть. Если значение содержит ровно одно целое (например `5+`, `13+`), оно анимируется от 0 до целевого с `easeOutCubic` за 1.2s, **запускается при первом `IntersectionObserver`-входе в зону видимости (threshold 0.4)** и отключает наблюдение сразу после старта. Значения без чисел (`Best`, `3 in 1`) показываются без анимации.

Начальный рендер всегда показывает финальное значение — это и убирает hydration mismatch, и удовлетворяет правило React 19.2 «не вызывай setState синхронно в теле эффекта»: `setState` вызывается только из `requestAnimationFrame`-колбэка после `IntersectionObserver`.

При `prefers-reduced-motion: reduce` счётчик не запускается.

## Тактильный фидбек

`src/lib/haptics.ts` — крошечная обёртка над `navigator.vibrate`. Срабатывает на всех ключевых кликах (логотип, ссылки навигации, переключатель языка, login, CTA, app-кнопки, submit). На устройствах без vibrate API это no-op.

## Интеграция

- `Header` смонтирован в `src/app/layout.tsx` — присутствует на всех страницах.
- `Hero` подключён первой секцией в `src/app/page.tsx`. Остальные секции (`features`, `sports`, `crm`, `pricing`, `social`, `download`, `contact`) пока остаются плейсхолдерами.

## Стек принятых решений

- **Не выносим LoginModal/LanguageSwitcher в context/portal:** их по одному, состояние локально, портал не нужен — у нас тёмный фон без перекрывающих stacking-контекстов выше z-index 50.
- **Sticky вместо fixed:** sticky не вырезает Hero под себя (естественный flow), и top:0 даёт идентичное поведение на длинных страницах.
- **Без библиотек анимации:** все анимации на CSS (`@keyframes`) и одном `requestAnimationFrame` — без зависимостей вроде framer-motion.
- **`use server`/Server Actions для логина не используем:** API уже есть в `/api/auth/login`, форма отправляет fetch — это упрощает работу с ошибками и retry без `useFormState`.
