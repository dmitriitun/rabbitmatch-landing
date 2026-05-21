# Comparison section

«RabbitMatch vs alternatives» — таблица сравнения с конкурентами (Excel/Calls, Playtomic, RabbitMatch). Закреплена за якорем `#comparison` (нового пункта меню нет — секция доступна по скроллу).

## Контент

Восемь строк × три колонки сравнения:

| Opportunity | Excel / Calls | Playtomic | RabbitMatch |
|---|---|---|---|
| Online booking | ✗ (красный) | ✓ (нейтральный) | ✓ (лайм) |
| Ecosystem | ✗ | Simple | Full |
| CRM and analytics | ✗ | ✓ | ✓✓✓ |
| Tournaments and game formats | ✗ | Minimal | Diverse |
| Localization | ✗ | Does not work in Georgia | Full |
| Quick access from Telegram and Web | ✗ | ✗ | ✓ |
| Booking commission | Bank acquiring up to 5% | 8–10% (красный) | 6.5% (лайм) |
| Price | Errors, loss of data and control | $326/month (красный) | FREE for the first 2 months, then from $39/month |

Контент полностью локализован (`messages/{en,ru}.json`, ключ `comparison.*`).

## Архитектура

```
src/components/
  Comparison/
    Comparison.tsx          (server) — table + card stack
    Comparison.module.css
```

Внутри `Comparison.tsx`:

- **`ROWS`** — конфигурация: каждая строка содержит `id`, `labelKey` и три ячейки (`excel`, `playtomic`, `rabbit`). Каждая ячейка типизирована:
  - `{ kind: 'check', count?: 1 | 3, tone }` — одна или три галочки (для CRM RabbitMatch).
  - `{ kind: 'cross', tone }` — крест.
  - `{ kind: 'text', value: string, tone }` — текстовое значение, `value` — ключ из `comparison.values.*`.
- **`tone`** — `'lime' | 'red' | 'neutral'`, мапится в CSS-классы `.toneLime` / `.toneRed` / `.toneNeutral`. Лайм имеет дополнительный `drop-shadow` для иконок (мягкое свечение).
- **`CellView`** — компонент-рендер, переключающийся по `kind`. Иконки — `Check` и `X` из lucide, `strokeWidth: 2.4`. Текстовые значения берутся через `t('values.<value>')`.

## Два режима отображения

**Десктоп (≥720px) — `<table>`:**

- Колонка «Opportunity» `width: 30%`, выровнена влево.
- Шапка таблицы с заголовками колонок; колонка RabbitMatch выделена лаймом + `text-shadow` (мягкий glow).
- Строки `tbody` имеют hover-подсветку и тонкие нижние границы `rgba(229,231,235, 0.08)` (соответствует `--color-border` с прозрачностью).
- Колонка RabbitMatch имеет slight `linear-gradient` фон по высоте — визуально доминирует.
- Сетка реализована через `border-collapse: collapse` + `border-bottom` на ячейках; правые/левые границы не нужны, поэтому таблица выглядит «безрамочной» и спокойной — точно как на референсе.

**Мобайл (<720px) — `<ul>` с карточками:**

- Каждая строка превращается в карточку с заголовком («Opportunity») и тремя `<dl>`-парами: Excel/Calls, Playtomic, RabbitMatch.
- Карточки имеют `border` `rgba(255,255,255,0.08)` и при hover лайм-бордер с подъёмом на 1px.
- Строка RabbitMatch внутри карточки получает выраженный лайм-фон и lime-бордер — выделяется как победитель.

CSS-переключение через media query: при ≥720px `.cards { display: none }` и `.tableScroll { display: block }`, и наоборот ниже.

## Анимация

Через `ScrollReveal` (`as="tr"` для таблицы, `as="li"` для мобильных карточек). Каскад `delayMs` нарастает по 70ms на строку. Заголовок секции появляется первым, без задержки.

## Дизайн-токены

- Лайм — `var(--color-lime)` (#B9E901), мягкое свечение `0 0 22px rgba(185, 233, 1, 0.3)` для заголовка колонки RabbitMatch.
- Красный для негативных значений — `var(--color-danger)` (#EF4444).
- Нейтральный текст — `#d1d5db` (≈ `--color-border` светлее) — отличает от лайма и красного, но не теряется на чёрном.
- Фон секции — два радиальных glow (фиолетовый сверху-слева, лайм снизу-справа).

## Интеграция

`src/app/page.tsx` рендерит `<Comparison />` после `<Launch />`. Якоря в Header пока не добавлены — пункт меню можно завести позже, если потребуется.
