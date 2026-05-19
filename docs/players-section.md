# Players Find You section

Третья крупная секция лендинга — «The players find you themselves / Игроки находят вас сами». Закреплена за якорем `#crm`, на который ведёт пункт меню «For Clubs».

## Контент

Три блока с одинаковой структурой `[иконка] заголовок / описание / лайм-акцент`:

| Заголовок | Акцент |
|---|---|
| **Tournaments and games** — 5+ форматов и 20+ кастомных настроек, рейтинговая система, растущая база игроков. | `On average +30% in customers for bookings` |
| **Court booking** — дата/время/корт за 2 клика, интеграция с CRM. | `On average +40% in bookings` |
| **Full control** — цены, абонементы, расписание, акции, новости. | `Your schedule is always at hand` |

Под блоками — CTA «Connect your club for free / Подключить свой клуб бесплатно».

Справа — диагональный «фан» из четырёх iPhone-мокапов (`phone-match-form.png`, `phone-match-map.png`, `phone-courts-2.png`, `phone-profile.png`).

## Дерево компонентов

```
src/components/
  Players/
    Players.tsx            (server) — собирает текст, иконки, мокапы
    Players.module.css
    PlayersCta.tsx         (client) — кнопка, открывает ContactModal
  ContactModal/
    ContactModal.tsx       (client) — белая карточка на тёмном backdrop
    ContactModal.module.css
public/images/
  phone-match-form.png
  phone-match-map.png
  phone-courts-2.png
  phone-profile.png
```

## ContactModal

Открывается только при `open === true` (родительский `PlayersCta` условно монтирует компонент) — это даёт чистый сброс состояния через unmount и удовлетворяет правило React 19.2 `react-hooks/set-state-in-effect`.

- **Backdrop:** `rgba(0,0,0,0.72)` + `backdrop-filter: blur(10px)`. Клик по фону — закрытие.
- **Карточка:** белая, `border-radius: 24px`, контрастно выделяется на тёмном сайте. Тень `0 30px 80px rgba(0,0,0,0.55)`.
- **Поля:** Name + Email (в один ряд ≥560px), Club name, Message. Иконки `User`, `Mail`, `Building2`, `MessageCircle` слева. Фокус — фиолетовый бордер `#4300BD` + мягкое кольцо `0 0 0 4px rgba(67,0,189,0.12)` (perfectly соответствует фирменному фиолетовому).
- **Submit:** чёрный фон, лаймовый текст с иконкой `Send`, состояние `submitting` показывает loader, успех — крупный success-box с лайм-фоном и иконкой `CheckCircle2`. При ошибке — красный errorBox.
- **Отправка:** POST `/api/contact` с телом `{ name, email, message, locale, source: 'players-section' }`. Club name склеивается в начало сообщения как `[Club name]\n\n<сообщение>` — без миграций таблицы (поле `message` уже есть, отдельная колонка под клуб пока не нужна).
- **Прямые контакты под формой:** Telegram (из `NEXT_PUBLIC_CONTACT_TELEGRAM` — приведение `@handle`/`https://...` к корректному URL `https://t.me/...`) и Email (`mailto:...`). Если оба env-переменные не заданы — блок не рендерится.
- **A11y:** Esc закрывает, фокус возвращается на инициатор, body lock, ARIA-роли `dialog`/`presentation`.

## Phone fan

На широких экранах (≥960px) четыре мокапа разложены диагонально через `position: absolute` с возрастающими `top` и `left`, лёгкими `rotate` и нарастающим `z-index` — повторяет композицию референс-слайда. Hover на любой телефон чуть приподнимает его и добавляет лайм-glow к drop-shadow.

На мобильных мокапы переходят в обычную 2×2 сетку, чтобы не уходить в крошечный масштаб.

## Визуальные эффекты

- Фон секции — два радиальных glow (лайм 88%/14%, фиолетовый 8%/90%) — баланс по диагонали.
- Декоративные угловые рамки (`.cornerTL` / `.cornerBR`) — тонкая `1px` обводка в углах секции, та же фишка с референс-слайда.
- Карточки блоков при hover поднимаются на 2px и подсвечивают лайм-бордер.
- CTA — лаймовая pill-кнопка со стрелкой `ArrowRight`. Стрелка сдвигается на 3px вправо при hover.

## ScrollReveal

В Players используется как и в Solution: задержка `delayMs` нарастает сверху вниз (текстовая колонка) и слева-направо (фан телефонов). Reduced-motion обрабатывается на уровне CSS.

## Интеграция

`src/app/page.tsx` рендерит `<Players />` после `<Solution />`. Якорь `#crm` теперь принадлежит этой секции, поэтому из массива плейсхолдеров он убран — а пункт меню «For Clubs» ведёт сюда (см. [src/components/Header/Header.tsx](../src/components/Header/Header.tsx)).
