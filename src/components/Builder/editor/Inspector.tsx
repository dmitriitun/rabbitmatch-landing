'use client';

import { useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import {
  COLS_DESKTOP,
  COLS_MOBILE,
  type BuilderNode,
  type BuilderSection,
  type MediaNode,
  type NodeBoxStyle,
  type SectionWidth,
  type Sides,
} from '@/lib/builder/types';
import { MediaPicker, type MediaPick } from './MediaPicker';
import { MEDIA_PLACEHOLDER } from './docOps';
import type { CanvasApi } from './Canvas';
import {
  Check,
  ColorInput,
  editorStyles as styles,
  Field,
  Group,
  NumberInput,
  Segmented,
  TextInput,
} from './ui';

/**
 * The settings panel for whatever is selected.
 *
 * Every control that affects layout appears twice — once for the desktop grid,
 * once for the phone — because a builder that only exposes one of them is how
 * authored pages end up broken on the device most visitors actually use.
 */

const ALIGN_OPTIONS = [
  { value: 'start' as const, label: <AlignLeft size={13} />, title: 'По левому краю' },
  { value: 'center' as const, label: <AlignCenter size={13} />, title: 'По центру' },
  { value: 'end' as const, label: <AlignRight size={13} />, title: 'По правому краю' },
];

export function Inspector({
  section,
  node,
  api,
}: {
  section: BuilderSection | undefined;
  node: BuilderNode | undefined;
  api: CanvasApi;
}) {
  if (!section) {
    return (
      <aside className={`${styles.root} ${styles.panel}`}>
        <p className={styles.panelEmpty}>
          Ничего не выбрано. Кликните по секции или элементу на странице, либо добавьте новую секцию
          кнопкой в верхней панели.
        </p>
      </aside>
    );
  }

  return (
    <aside className={`${styles.root} ${styles.panel}`}>
      {node ? (
        <NodeInspector section={section} node={node} api={api} />
      ) : (
        <SectionInspector section={section} api={api} />
      )}
    </aside>
  );
}

/* --- Node ---------------------------------------------------------------- */

function NodeInspector({
  section,
  node,
  api,
}: {
  section: BuilderSection;
  node: BuilderNode;
  api: CanvasApi;
}) {
  const patch = (value: Partial<BuilderNode>) => api.patchNode(section.id, node.id, value);

  return (
    <>
      <header className={styles.panelHead}>
        <span className={styles.panelTitle}>Элемент</span>
        <div className={styles.row}>
          <button
            type="button"
            className={`${styles.btn} ${styles.iconBtn}`}
            title="Поднять над соседями"
            onClick={() => api.reorderNode(section.id, node.id, 1)}
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.iconBtn}`}
            title="Опустить под соседей"
            onClick={() => api.reorderNode(section.id, node.id, -1)}
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.iconBtn}`}
            title="Дублировать"
            onClick={() => api.copyNode(section.id, node.id)}
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.iconBtn} ${styles.btnDanger}`}
            title="Удалить"
            onClick={() => api.removeNode(section.id, node.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      {node.type === 'text' ? (
        <button type="button" className={styles.btn} onClick={() => api.setEditing(node.id)}>
          Редактировать текст
        </button>
      ) : null}

      {node.type === 'media' ? <MediaFields node={node} section={section} api={api} /> : null}
      {node.type === 'button' ? <ButtonFields node={node} patch={patch} /> : null}
      {node.type === 'divider' ? (
        <Group title="Линия">
          <div className={styles.row}>
            <ColorInput value={node.color} allowClear onChange={(color) => patch({ color })} />
            <span className={styles.hint}>Цвет линии</span>
          </div>
        </Group>
      ) : null}

      <BoxStyleFields node={node} patch={patch} />

      <Group title="Позиция на десктопе">
        <div className={styles.row}>
          <Field label={`Колонка (0–${COLS_DESKTOP - 1})`}>
            <NumberInput
              value={node.box.x}
              min={0}
              max={COLS_DESKTOP - 1}
              onChange={(x) => patch({ box: { ...node.box, x } })}
            />
          </Field>
          <Field label={`Ширина (1–${COLS_DESKTOP})`}>
            <NumberInput
              value={node.box.w}
              min={1}
              max={COLS_DESKTOP}
              onChange={(w) => patch({ box: { ...node.box, w } })}
            />
          </Field>
        </div>
        <div className={styles.row}>
          <Field label="Ряд">
            <NumberInput value={node.box.y} min={0} max={400} onChange={(y) => patch({ box: { ...node.box, y } })} />
          </Field>
          <Field label="Высота, рядов по 24px">
            <NumberInput value={node.box.h} min={1} max={200} onChange={(h) => patch({ box: { ...node.box, h } })} />
          </Field>
        </div>
        <Field label="Содержимое по вертикали">
          <Segmented
            value={node.valign ?? 'start'}
            options={[
              { value: 'start', label: 'Сверху' },
              { value: 'center', label: 'По центру' },
              { value: 'end', label: 'Снизу' },
            ]}
            onChange={(valign) => patch({ valign })}
          />
        </Field>
        <Check
          checked={node.hiddenDesktop === true}
          label="Скрыть на десктопе"
          onChange={(hiddenDesktop) => patch({ hiddenDesktop })}
        />
      </Group>

      <Group title="На телефоне">
        <p className={styles.hint}>
          На узком экране элементы выстраиваются в столбик в том же порядке, в каком они идут сверху
          вниз и слева направо на десктопе. Здесь настраивается только ширина и выравнивание.
        </p>
        <Field label={`Ширина (1–${COLS_MOBILE} из ${COLS_MOBILE})`}>
          <NumberInput
            value={node.mobile.w}
            min={1}
            max={COLS_MOBILE}
            onChange={(w) => patch({ mobile: { ...node.mobile, w } })}
          />
        </Field>
        <Field label="Выравнивание">
          <Segmented
            value={node.mobile.align}
            options={ALIGN_OPTIONS}
            onChange={(align) => patch({ mobile: { ...node.mobile, align } })}
          />
        </Field>
        <Check
          checked={node.mobile.hidden}
          label="Скрыть на телефоне"
          onChange={(hidden) => patch({ mobile: { ...node.mobile, hidden } })}
        />
      </Group>
    </>
  );
}

function MediaFields({
  node,
  section,
  api,
}: {
  node: MediaNode;
  section: BuilderSection;
  api: CanvasApi;
}) {
  /*
    A freshly added image still shows the shipped placeholder, which means
    nobody has chosen a file for it yet — so open the picker straight away.
    "Add image" should put an image on the page, not a grey box plus homework.
  */
  const [picking, setPicking] = useState(node.src === MEDIA_PLACEHOLDER);
  const patch = (value: Partial<MediaNode>) => api.patchNode(section.id, node.id, value);

  const applyPick = (pick: MediaPick) => {
    patch({
      media: pick.media,
      src: pick.src,
      assetId: pick.assetId,
      width: pick.width,
      height: pick.height,
    });
  };

  return (
    <>
      <Group title="Медиа">
        <button type="button" className={styles.btn} onClick={() => setPicking(true)}>
          <ImageIcon size={14} />
          Выбрать файл или ссылку
        </button>

        <Field label="Тип">
          <Segmented
            value={node.media}
            options={[
              { value: 'image', label: 'Фото / GIF' },
              { value: 'video', label: 'Видео' },
              { value: 'embed', label: 'Встраивание' },
            ]}
            onChange={(media) => patch({ media })}
          />
        </Field>

        <Field label="Источник">
          <TextInput value={node.src} onChange={(src) => patch({ src })} />
        </Field>

        <Field label="Alt — что на изображении (для поиска и незрячих)">
          <TextInput value={node.alt} onChange={(alt) => patch({ alt })} placeholder="Опишите картинку" />
        </Field>
        {node.media === 'image' && !node.alt ? (
          <p className={styles.hint}>
            Без alt картинка не участвует в поиске по изображениям. Оставьте пустым только если она
            чисто декоративная.
          </p>
        ) : null}

        <div className={styles.row}>
          <Field label="Заполнение">
            <Segmented
              value={node.fit}
              options={[
                { value: 'cover', label: 'Обрезать' },
                { value: 'contain', label: 'Вписать' },
              ]}
              onChange={(fit) => patch({ fit })}
            />
          </Field>
          <Field label="Скругление">
            <NumberInput value={node.radius} min={0} max={64} onChange={(radius) => patch({ radius })} />
          </Field>
        </div>

        <Field label="Ссылка при клике (необязательно)">
          <TextInput value={node.href ?? ''} onChange={(href) => patch({ href: href || undefined })} placeholder="/pricing" />
        </Field>

        {node.media === 'video' ? (
          <>
            <Check
              checked={node.autoplay === true}
              label="Автовоспроизведение (как GIF)"
              onChange={(autoplay) => patch({ autoplay, muted: autoplay ? true : node.muted })}
            />
            <Check checked={node.loop === true} label="Зациклить" onChange={(loop) => patch({ loop })} />
            <Check
              checked={node.muted !== false}
              label="Без звука"
              onChange={(muted) => patch({ muted })}
            />
            <Check
              checked={node.controls !== false}
              label="Показывать элементы управления"
              onChange={(controls) => patch({ controls })}
            />
            {node.autoplay ? (
              <p className={styles.hint}>
                Автозапуск браузеры разрешают только без звука — звук выключен принудительно.
              </p>
            ) : null}
          </>
        ) : null}
      </Group>

      {picking ? <MediaPicker onPick={applyPick} onClose={() => setPicking(false)} /> : null}
    </>
  );
}

const NO_PAD: Sides = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * Decoration on the element's own box.
 *
 * This is what carries an imported card across: the fill, the hairline and the
 * inner padding it had in the original markup. It doubles as ordinary design
 * control for anything built by hand.
 */
function BoxStyleFields({
  node,
  patch,
}: {
  node: BuilderNode;
  patch: (value: Partial<BuilderNode>) => void;
}) {
  const box = node.boxStyle ?? {};
  const set = (value: Partial<NodeBoxStyle>) => patch({ boxStyle: { ...box, ...value } });

  return (
    <Group title="Оформление блока">
      <div className={styles.row}>
        <ColorInput value={box.background} allowClear onChange={(background) => set({ background })} />
        <span className={styles.hint}>Заливка</span>
      </div>
      <div className={styles.row}>
        <ColorInput value={box.border} allowClear onChange={(border) => set({ border })} />
        <Field label="Толщина рамки">
          <NumberInput value={box.borderWidth ?? 0} min={0} max={12} onChange={(borderWidth) => set({ borderWidth })} />
        </Field>
        <Field label="Скругление">
          <NumberInput value={box.radius ?? 0} min={0} max={64} onChange={(radius) => set({ radius })} />
        </Field>
      </div>
      <Field label="Тень">
        <Segmented
          value={box.shadow ?? 'none'}
          options={[
            { value: 'none', label: 'Нет' },
            { value: 'sm', label: 'S' },
            { value: 'md', label: 'M' },
            { value: 'lg', label: 'L' },
          ]}
          onChange={(shadow) => set({ shadow })}
        />
      </Field>
      <SidesFields
        title="Внутренние отступы, px"
        value={box.padding ?? NO_PAD}
        onChange={(padding) => set({ padding })}
      />
    </Group>
  );
}

function ButtonFields({
  node,
  patch,
}: {
  node: Extract<BuilderNode, { type: 'button' }>;
  patch: (value: Partial<BuilderNode>) => void;
}) {
  return (
    <Group title="Кнопка">
      <Field label="Надпись">
        <TextInput value={node.label} onChange={(label) => patch({ label })} />
      </Field>
      <Field label="Ссылка">
        <TextInput value={node.href} onChange={(href) => patch({ href })} placeholder="/pricing, #contact, https://…" />
      </Field>
      <p className={styles.hint}>
        Внутренние адреса пишите без языка: `/pricing` сам станет `/ru/pricing` или `/en/pricing`.
        Для перехода к секции на этой же странице — `#якорь` из настроек секции.
      </p>
      <Field label="Стиль">
        <Segmented
          value={node.variant}
          options={[
            { value: 'primary', label: 'Основная' },
            { value: 'secondary', label: 'Тёмная' },
            { value: 'ghost', label: 'Контур' },
          ]}
          onChange={(variant) => patch({ variant })}
        />
      </Field>
      <Field label="Размер">
        <Segmented
          value={node.size}
          options={[
            { value: 'sm', label: 'S' },
            { value: 'md', label: 'M' },
            { value: 'lg', label: 'L' },
          ]}
          onChange={(size) => patch({ size })}
        />
      </Field>
      <Field label="Выравнивание на десктопе">
        <Segmented value={node.align} options={ALIGN_OPTIONS} onChange={(align) => patch({ align })} />
      </Field>
      <Check checked={node.newTab === true} label="Открывать в новой вкладке" onChange={(newTab) => patch({ newTab })} />
    </Group>
  );
}

/* --- Section ------------------------------------------------------------- */

const WIDTH_OPTIONS: ReadonlyArray<{ value: SectionWidth; label: string }> = [
  { value: 'narrow', label: 'Узкая' },
  { value: 'normal', label: 'Обычная' },
  { value: 'wide', label: 'Широкая' },
  { value: 'full', label: 'Во всю' },
];

function SectionInspector({ section, api }: { section: BuilderSection; api: CanvasApi }) {
  const [picking, setPicking] = useState(false);
  const patch = (value: Partial<BuilderSection>) => api.patchSection(section.id, value);
  const bg = section.background;

  return (
    <>
      <header className={styles.panelHead}>
        <span className={styles.panelTitle}>Секция</span>
        <div className={styles.row}>
          <button
            type="button"
            className={`${styles.btn} ${styles.iconBtn}`}
            title="Дублировать"
            onClick={() => api.duplicateSection(section.id)}
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.iconBtn} ${styles.btnDanger}`}
            title="Удалить"
            onClick={() => api.removeSection(section.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      <Field label="Название (видно только в редакторе)">
        <TextInput value={section.name ?? ''} onChange={(name) => patch({ name: name || undefined })} />
      </Field>

      <Field label="Якорь для ссылок вида #имя">
        <TextInput
          value={section.anchor ?? ''}
          onChange={(anchor) => patch({ anchor: anchor || undefined })}
          placeholder="tariffs"
        />
      </Field>

      {/* Once the document is the page there is no hand-written body to sit
          above or below, so the choice would mean nothing. */}
      {api.takeover ? null : (
        <Field label="Место на странице">
          <Segmented
            value={section.slot === 'page' ? 'bottom' : section.slot}
            options={[
              { value: 'top', label: 'Сверху' },
              { value: 'bottom', label: 'Снизу' },
            ]}
            onChange={(slot) => patch({ slot })}
          />
        </Field>
      )}

      <Field label="Ширина контента">
        <Segmented value={section.width} options={WIDTH_OPTIONS} onChange={(width) => patch({ width })} />
      </Field>

      <Field label="Цвет текста">
        <Segmented
          value={section.tone}
          options={[
            { value: 'auto', label: 'Как на сайте' },
            { value: 'dark', label: 'Светлый' },
            { value: 'light', label: 'Тёмный' },
          ]}
          onChange={(tone) => patch({ tone })}
        />
      </Field>

      <Group title="Фон">
        <Field label="Тип">
          <Segmented
            value={bg.kind}
            options={[
              { value: 'none', label: 'Нет' },
              { value: 'color', label: 'Цвет' },
              { value: 'image', label: 'Картинка' },
            ]}
            onChange={(kind) => patch({ background: { ...bg, kind } })}
          />
        </Field>

        {bg.kind !== 'none' ? (
          <div className={styles.row}>
            <ColorInput
              value={bg.color}
              allowClear
              onChange={(color) => patch({ background: { ...bg, color } })}
            />
            <span className={styles.hint}>
              {bg.kind === 'image' ? 'Цвет под картинкой' : 'Цвет фона'}
            </span>
          </div>
        ) : null}

        {bg.kind === 'image' ? (
          <>
            <button type="button" className={styles.btn} onClick={() => setPicking(true)}>
              <ImageIcon size={14} />
              Выбрать картинку
            </button>
            <Field label="Адрес картинки">
              <TextInput value={bg.src ?? ''} onChange={(src) => patch({ background: { ...bg, src } })} />
            </Field>
            <div className={styles.row}>
              <Field label="Как вписать">
                <Segmented
                  value={bg.size ?? 'cover'}
                  options={[
                    { value: 'cover', label: 'Заполнить' },
                    { value: 'contain', label: 'Вписать' },
                  ]}
                  onChange={(size) => patch({ background: { ...bg, size } })}
                />
              </Field>
            </div>
            <Field label="Положение">
              <TextInput
                value={bg.position ?? 'center'}
                onChange={(position) => patch({ background: { ...bg, position } })}
                placeholder="center, top, 50% 20%"
              />
            </Field>
            <Field label={`Затемнение — ${Math.round((bg.overlay ?? 0) * 100)}%`}>
              <input
                className={styles.input}
                type="range"
                min={0}
                max={100}
                value={Math.round((bg.overlay ?? 0) * 100)}
                onChange={(e) => patch({ background: { ...bg, overlay: Number(e.target.value) / 100 } })}
              />
            </Field>
            <Check
              checked={bg.repeat === true}
              label="Замостить плиткой"
              onChange={(repeat) => patch({ background: { ...bg, repeat } })}
            />
          </>
        ) : null}
      </Group>

      <SidesFields
        title="Отступы на десктопе, px"
        value={section.pad}
        onChange={(pad) => patch({ pad })}
      />
      <SidesFields
        title="Отступы на телефоне, px"
        value={section.padMobile}
        onChange={(padMobile) => patch({ padMobile })}
      />

      <Group title="Минимальная высота, px">
        <div className={styles.row}>
          <Field label="Десктоп">
            <NumberInput
              value={section.minHeight ?? 0}
              min={0}
              max={2000}
              onChange={(minHeight) => patch({ minHeight: minHeight || undefined })}
            />
          </Field>
          <Field label="Телефон">
            <NumberInput
              value={section.minHeightMobile ?? 0}
              min={0}
              max={2000}
              onChange={(minHeightMobile) => patch({ minHeightMobile: minHeightMobile || undefined })}
            />
          </Field>
        </div>
      </Group>

      <Group title="Видимость">
        <Check checked={section.hidden === true} label="Скрыть везде" onChange={(hidden) => patch({ hidden })} />
        <Check
          checked={section.hiddenMobile === true}
          label="Скрыть на телефоне"
          onChange={(hiddenMobile) => patch({ hiddenMobile })}
        />
      </Group>

      {picking ? (
        <MediaPicker
          onPick={(pick) => patch({ background: { ...bg, kind: 'image', src: pick.src, assetId: pick.assetId } })}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </>
  );
}

function SidesFields({
  title,
  value,
  onChange,
}: {
  title: string;
  value: Sides;
  onChange: (value: Sides) => void;
}) {
  return (
    <Group title={title}>
      <div className={styles.row}>
        <Field label="Сверху">
          <NumberInput value={value.top} min={0} max={400} onChange={(top) => onChange({ ...value, top })} />
        </Field>
        <Field label="Снизу">
          <NumberInput value={value.bottom} min={0} max={400} onChange={(bottom) => onChange({ ...value, bottom })} />
        </Field>
      </div>
      <div className={styles.row}>
        <Field label="Слева">
          <NumberInput value={value.left} min={0} max={200} onChange={(left) => onChange({ ...value, left })} />
        </Field>
        <Field label="Справа">
          <NumberInput value={value.right} min={0} max={200} onChange={(right) => onChange({ ...value, right })} />
        </Field>
      </div>
    </Group>
  );
}
