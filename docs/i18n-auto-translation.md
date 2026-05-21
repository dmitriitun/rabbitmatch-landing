# Auto-translation pipeline (EN → RU)

Источник правды — `messages/en.json`. Русский каталог `messages/ru.json` поддерживается автоматически через Microsoft Azure Translator: при пуше в `main` GitHub Actions запускает скрипт, который заполняет недостающие и пере-переводит изменённые ключи, затем коммитит результат обратно.

Зеркало основного репозитория (`dmitriitun/rabbitMatch` → `.github/workflows/translate.yml` + `scripts/translate.js`), но адаптирован под нашу структуру: один target-язык, плоский JSON с массивами, источник = EN, кэш для детекта изменённых ключей.

## Файлы

```
.github/workflows/translate.yml  # триггер + commit-and-push
scripts/translate.js             # сам перевод
messages/en.json                 # источник правды
messages/ru.json                 # генерится автоматически (можно править руками)
messages/.translation-cache.json # последняя версия EN-источника по каждому ключу
```

## Workflow

- **Триггер:** `push` в `main` с фильтром `paths: messages/en.json`. Также доступен `workflow_dispatch` для ручного запуска.
- **Защита от петли:** workflow следит только за `en.json`, а пишет в `ru.json` / `.translation-cache.json` — поэтому собственный commit не вызывает повторного запуска. Если перевод ничего не изменил, шаг `git diff --cached --quiet` пропускает commit.
- **Concurrency:** `translate-<ref>` без отмены — параллельные пуши встают в очередь, чтобы не разваливать кэш.
- **Permissions:** `contents: write` — нужен, чтобы action мог сделать push.
- **Секреты:** `AZURE_TRANSLATOR_KEY`, `AZURE_TRANSLATOR_REGION`. Те же, что в основном репозитории RabbitMatch.

Коммит делает `github-actions[bot]`, сообщение: `chore(i18n): auto-translate EN → RU`.

## Скрипт `scripts/translate.js`

### Алгоритм

1. Читает `messages/en.json`, `messages/ru.json` (если есть) и `messages/.translation-cache.json` (если есть).
2. **Flatten** обоих JSON в плоскую мапу `'a.b.c' → leaf`. Массивы плющатся индексами (`solution.crm.nav.0`, `.1`, …) — это позволяет переводить элементы массива независимо. Не-строковые листы (числа, булевы, null) проходят насквозь.
3. Для каждого ключа из EN определяет, нужно ли его переводить:
   - **missing** — ключ отсутствует в RU или там пустая строка;
   - **changed** — кэш для этого ключа отличается от текущего значения EN.
   Иначе — оставить существующий перевод.
4. **Prune:** ключи, которые есть в RU/кэше, но больше нет в EN, удаляются.
5. Переводы делаются батчами по 25 строк за один POST на Azure (`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=ru`). Если батч падает — фолбэк per-item, чтобы один битый ключ не утопил остальные.
6. После каждого батча — `sleep(100ms)` против rate-limit.
7. **Unflatten** обратно в дерево (с восстановлением массивов: если все следующие сегменты — целые числа, создаётся `[]`, иначе `{}`).
8. Запись `messages/ru.json` и `messages/.translation-cache.json` (двухпробельный JSON, перенос строки в конце).

### Бережное обращение с плейсхолдерами

`{{name}}` и `{name}` — частые i18n-плейсхолдеры. Перед отправкой в Azure они заменяются на инертные маркеры `___RM_PH_<i>___`, чтобы переводчик их не локализовал. После ответа маркеры подменяются на оригинальные плейсхолдеры. Так перевод `Hello, {{name}}!` → `Привет, {{name}}!` остаётся синтаксически валидным.

### Кэш

`messages/.translation-cache.json` — это `{ [flatKey]: lastTranslatedEnValue }`. Хранится в репозитории и коммитится вместе с `ru.json`. Без кэша скрипт не мог бы отличить «текст в EN поменялся, нужен новый перевод» от «всё хорошо, ничего не трогаем».

### Запуск локально

```bash
export AZURE_TRANSLATOR_KEY=...
export AZURE_TRANSLATOR_REGION=westeurope
npm run translate
```

Любые ручные правки `ru.json` сохраняются — скрипт перетирает только те ключи, чьи EN-источники поменялись или которых не было раньше.

## Расширение на новые языки

Добавление, например, `messages/ka.json`:

1. В `scripts/translate.js` превратить `TARGET_LANG` в массив (`['ru', 'ka']`) и пройтись по нему в цикле, переключая target/cache на язык.
2. Поправить yml: в `git add` добавить `messages/ka.json` и второй кэш-файл.
3. В `src/i18n/config.ts` добавить `'ka'` в массив `locales` и переводы в next-intl.

Этот шаг сейчас не делаем — текущий продукт поддерживает только EN/RU.
