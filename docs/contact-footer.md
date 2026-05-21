# Contact section + Footer

Финальный CTA-блок страницы и общий footer.

## Contact section

Inline-секция с формой заявки. Закреплена за якорем `#contact`, на который ведёт пункт меню «Contact» и CTA-кнопки `Get Started` в Header и в Hero.

### Структура

- Eyebrow `Contact us / Связаться`.
- Заголовок `Ready to grow your club? / Готовы развивать клуб?` — крупный градиентный (`#fff → #c7c7c7`).
- Лид-параграф (про настройку CRM за 48 часов и бесплатное демо).
- Стеклянная карточка с формой `ContactForm` (вариант `dark`).
- Под формой — прямые ссылки на Telegram и Email (если соответствующие env заданы).

### Фон

- Два радиальных glow: лайм слева сверху + насыщенный фиолетовый снизу справа — приглушённый «лайм/фиолетовый градиент» из ТЗ.
- Точечная radial-маска поверх — мягкий шум, не отвлекает.

## ContactForm

Переиспользуемый клиентский компонент, который теперь используется и в [секции Contact](../src/components/Contact/Contact.tsx), и в [ContactModal](../src/components/ContactModal/ContactModal.tsx) (модалка из секции «For Clubs» и кнопок Pricing).

### Поведение

- Поля: Name (User), Email (Mail), Club name (Building2), Message (textarea, MessageCircle).
- **Валидация на клиенте:** `Name`, `Email`, `Message` обязательны; email проверяется регуляркой `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Ошибка показывается под полем (`aria-describedby`, `aria-invalid`), бордер красный. Ошибка очищается при первом изменении этого поля.
- `Club name` опционален; если заполнен, в `message`-поле POST-запроса добавляется префиксом `[Club]\n\n<message>` — отдельной колонки в БД не нужно.
- POST `/api/contact` → PostgreSQL (`contact_requests`).
- **Успех:** заменяет форму на success-блок с лайм-кольцом вокруг иконки `CheckCircle2`. Кольцо пульсирует `ringPulse 2.2s ease-in-out infinite` (расширяющийся `box-shadow`), сама галочка появляется с `checkPop 600ms` (масштаб 0.4 → 1.15 → 1). Сообщение из `t('success')`.
- **Ошибка:** показывает красный `errorBox`, кнопка снова кликабельна.
- Submit показывает loader-иконку и текст `t('submitting')`.

### Варианты

`variant: 'light' | 'dark'` определяет всю цветовую схему:

- **dark** (для inline-секции на тёмной странице): полупрозрачные белые границы, лайм submit-кнопка, лайм фокус-кольцо.
- **light** (для модалки на белом фоне): серые границы, чёрная submit-кнопка с лайм-текстом, фиолетовое фокус-кольцо.

CSS Module использует селекторы вида `.shell_dark .input` / `.shell_light .input` — никаких дублирующих файлов.

### Доступность

- Каждое поле имеет уникальный `id` через `useId()`.
- Ошибки — `aria-describedby` / `aria-invalid`.
- Success — `role="status"` `aria-live="polite"`.

## ContactModal

После рефактора — лёгкая обёртка над `ContactForm` (вариант `light`): backdrop, focus-trap, Esc, body lock, заголовок и подзаголовок. Бизнес-логика (валидация, отправка, успех) живёт в `ContactForm`.

## Footer

Клиентский компонент в корневом `layout.tsx` — рендерится на всех страницах.

### Структура

Сетка три колонки на ≥768px, одна колонка на мобильных:

1. **Бренд:** логотип `/images/logo.png` (тот же файл, что в Header — НЕ дублируется), название, tagline и блок из 4 социальных иконок.
2. **Navigation:** четыре пункта (Features → `#features`, For Clubs → `#crm`, Pricing → `#pricing`, Contact → `#contact`) с smooth-scroll по клику.
3. **Legal:** Privacy Policy и Terms of Service — заглушки на `#` (контента ещё нет).

Под сеткой — горизонтальная разделительная линия и копирайт `© {текущий год} RabbitMatch. {tFooter('rights')}`. Год берётся из `new Date().getFullYear()`, чтобы не править вручную.

### Social-иконки

- `Instagram`, `Facebook`, `TikTok` — собственные inline-SVG (`src/components/icons/*Icon.tsx`), потому что lucide-react убрал брендовые иконки.
- `Telegram` — переиспользуем `TelegramIcon`, созданный в Hero.

Каждая иконка — пилюля 40×40 с тонкой рамкой, на hover — лайм-бордер, лайм-фон-tint, лайм-цвет и подъём на 1px. Если соответствующая env-переменная пуста, иконка не рендерится.

### Верхняя граница

`border-top: 1px solid rgba(229, 231, 235, 0.12)` — приглушённый `#E5E7EB` из дизайн-системы, чтобы не выбиваться на тёмном.

## Интеграция

- `<Contact />` — последняя секция в [src/app/page.tsx](../src/app/page.tsx) после плейсхолдеров. Плейсхолдер `contact` удалён.
- `<Footer />` — в [src/app/layout.tsx](../src/app/layout.tsx) сразу после `{children}` внутри `NextIntlClientProvider`.
