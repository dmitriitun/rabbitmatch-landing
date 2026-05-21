# Pricing section

«Subscriptions for clubs / Подписки для клубов» — три тарифа Classic / Comfort / Max с зачёркнутыми старыми и лайм-новыми ценами. Закреплена за якорем `#pricing` (пункт меню «Pricing» теперь ведёт сюда).

## Реассайн якорей

- ДО: `#pricing` принадлежал секции Launch (онбординг). Это был стретч — пункт меню «Pricing» вёл на онбординг.
- ПОСЛЕ: Launch получил `id="onboarding"`, Pricing забрал `#pricing`. Пункт меню теперь семантически правильный — ведёт на тарифы.

## Архитектура

```
src/components/
  Pricing/
    Pricing.tsx          (server)  — компоновка трёх карточек
    PricingCta.tsx       (client)  — кнопка-CTA, открывает ContactModal
    Pricing.module.css
```

`Pricing.tsx` пробегается по `TIERS = [classic, comfort, max]` и тянет все тексты через `t(\`${tier.key}.${field}\`)`. Цены — отдельные ключи `priceMonthlyOld / priceMonthlyNew / priceAnnualOld / priceAnnualNew` (см. ниже про редактирование админом).

## Карточка

Каждая карточка содержит:

1. **Бейдж сверху** (только у Comfort и Max). Comfort — лайм-pill «Most popular» с lime-glow. Max — фиолетово-сиреневый pill «AI» с иконкой `Sparkles` и фиолетовым glow (`#4300BD → #7c3aed`).
2. **Имя тарифа** — крупным uppercase с `letter-spacing: 0.14em`. Classic — белый, Comfort — линейный градиент `lime → cyan → purple`, Max — `lime → purple → pink`. Реализовано через `-webkit-background-clip: text`.
3. **Tagline** — короткое описание под названием.
4. **Список фич** — точечные маркеры (лайм-glow точки), `flex: 1` — занимает всё доступное место, чтобы низ карточек выровнялся.
5. **Две ценовые «пилюли»** — чёрные капсулы со старой ценой (зачёркнутой, faint-серая) и новой (крупный, лайм, мягкое свечение через `text-shadow`). Подписи `Monthly` / `Annual` сверху.
6. **CTA-кнопка** — pill, открывает общую `ContactModal`. Стилизация под тариф: Classic — стеклянная (rgba-white), Comfort — лайм, Max — фиолетовый градиент. Стрелка `ArrowRight` сдвигается на 3px при hover.

## Glassmorphism + анимированная рамка

Каждая карточка имеет два слоя стекла:

- Базовый: `linear-gradient(180deg, rgba(26,26,46,0.85), rgba(16,16,28,0.85))`, `backdrop-filter: blur(14px)`, мягкая тень.
- `::before` накладывает «бегущую» conic-gradient рамку (lime → purple → lime), отсечённую через `mask-composite: exclude`, так что цветится только 1px-обводка. Анимация `borderSpin 8s linear infinite` вращает градиент по кругу. Слой включается с `opacity: 0 → 1` только на hover (без hover не отвлекает). У каждого тарифа собственный hue для glow:
  - Classic — лайм
  - Comfort — голубой
  - Max — фиолетовый

`prefers-reduced-motion: reduce` гасит спин.

## Доминирование Comfort

На десктопе центральная карточка сдвинута на `translateY(-12px)` вверх и имеет дополнительный многослойный `box-shadow`: лайм-1px-кольцо, тень и lime-halo. Бейдж `Most popular` сидит ровно посередине верхней грани.

## Адаптив

- **≥720px:** три карточки в ряд `grid-template-columns: repeat(3, 1fr)`, Comfort приподнят, у всех одинаковая высота.
- **<720px:** вертикальная стопка, Comfort не приподнят, бейдж сохраняется. Высоты выравниваются по контенту, без drama.
- **<480px:** уменьшен padding, меньше шрифт у имени и цен.

## Редактирование цен админом

Цены живут в `messages/{en,ru}.json` как обычные строки. Это значит, что админ может редактировать их **из CMS через `/api/content`** (есть таблица `content_overrides (locale, key, value)`), не трогая код. Когда мы подключим перерасчёт переводов на лету через `content_overrides`, ключи вида `pricing.classic.priceMonthlyNew` будут просто override-нуты значениями из БД. Сейчас структура ключей готова под это.

## ScrollReveal

Заголовок появляется первым, карточки — каскадом с задержками 150 / 270 / 390 ms.

## Интеграция

`src/app/page.tsx` рендерит `<Pricing />` после `<Comparison />`. Якорь `#pricing` теперь принадлежит этой секции; Launch перенесён на `#onboarding`.
