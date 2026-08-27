'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileCode,
  FileText,
  Folder,
  IndentDecrease,
  IndentIncrease,
  Loader,
  Plus,
  SquareArrowOutUpRight,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { locales, type Locale } from '@/i18n/config';
import {
  buildTree,
  CODE_PAGE_SLUGS,
  flatten,
  nodeTitle,
  type NodeKind,
  type SiteNode,
  type TreeNode,
} from '@/lib/tree/types';
import { Check, editorStyles as styles, Field, Modal, Segmented, TextInput } from './ui';

/**
 * The site's own structure, edited from inside the builder.
 *
 * Sections, sub-sections and the pages inside them are rows in a table, not
 * files in `app/`, so this is where they are created. It sits in the builder
 * rather than in a separate admin screen for one reason: the two halves of
 * making a page are inventing it and filling it, and having to leave the
 * editor to do the first half is how a knowledge base ends up with fifteen
 * pages and no plan.
 *
 * Everything structural saves immediately — creating, moving, deleting. The
 * text fields do not: a title is typed a character at a time and a request per
 * keystroke would fight the person typing.
 */

const KIND_OPTIONS: ReadonlyArray<{ value: NodeKind; label: string; title: string }> = [
  { value: 'category', label: 'Раздел', title: 'Страница со списком того, что внутри' },
  { value: 'article', label: 'Статья', title: 'Страница с текстом и счётчиком просмотров' },
];

type Draft = {
  slug: string;
  kind: NodeKind;
  titles: Record<string, string>;
  summaries: Record<string, string>;
  inNav: boolean;
  hidden: boolean;
  openByDefault: boolean;
};

function toDraft(node: SiteNode): Draft {
  return {
    slug: node.slug,
    kind: node.kind,
    titles: Object.fromEntries(locales.map((l) => [l, node.titles[l] ?? ''])),
    summaries: Object.fromEntries(locales.map((l) => [l, node.summaries[l] ?? ''])),
    inNav: node.inNav,
    hidden: node.hidden,
    openByDefault: node.openByDefault,
  };
}

const ERRORS: Record<string, string> = {
  reserved_slug: 'Такой адрес занят страницей сайта. Выберите другой.',
  invalid_slug: 'Из этого названия не получается адрес — впишите его латиницей вручную.',
  cycle: 'Нельзя вложить раздел в самого себя.',
  duplicate: 'Слишком много разделов с таким адресом.',
  not_found: 'Раздел уже удалён — обновите список.',
  title_required: 'Впишите название хотя бы на одном языке.',
  storage_unavailable: 'База недоступна — изменение не сохранилось.',
  forbidden: 'Недостаточно прав.',
  unauthorized: 'Сессия истекла — войдите заново.',
};

export function SiteTreeManager({ locale, onClose }: { locale: string; onClose: () => void }) {
  // The hand-written pages are labelled from the same catalogue the header
  // reads, so the list here says exactly what the menu says.
  const nav = useTranslations('nav');
  const [nodes, setNodes] = useState<SiteNode[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set once anything structural changed, so closing reloads the page. */
  const [changed, setChanged] = useState(false);

  const active = (locale as Locale) ?? locales[0];

  const request = useCallback(
    async (init: RequestInit & { url?: string }): Promise<Record<string, unknown> | null> => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(init.url ?? '/api/site-tree', init);
        const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          const code = typeof body.error === 'string' ? body.error : '';
          setError(ERRORS[code] ?? `Не получилось (ошибка ${res.status}).`);
          return null;
        }
        return body;
      } catch {
        setError('Сеть недоступна.');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const reload = useCallback(async () => {
    const body = await request({ method: 'GET' });
    if (!body?.nodes) return;
    const fresh = body.nodes as SiteNode[];
    setNodes(fresh);

    /*
      Open on the section the admin is standing in. A page rendered from the
      tree leaves its id in the markup, and starting anywhere else would mean
      hunting for the row you were already looking at.
    */
    setSelectedId((current) => {
      if (current !== null && fresh.some((node) => node.id === current)) return current;
      const marker = document.querySelector<HTMLElement>('[data-rm-node-id]');
      const fromPage = marker ? Number(marker.dataset.rmNodeId) : NaN;
      if (Number.isFinite(fromPage) && fresh.some((node) => node.id === fromPage)) return fromPage;
      return fresh[0]?.id ?? null;
    });
  }, [request]);

  useEffect(() => {
    // Deferred out of the effect body so the first paint of the modal is not
    // waiting on a round trip that has nothing to show yet.
    const timer = setTimeout(() => void reload(), 0);
    return () => clearTimeout(timer);
  }, [reload]);

  const selected = nodes?.find((node) => node.id === selectedId) ?? null;

  /**
   * `draft` holds edits, not the current values.
   *
   * `null` means "nothing typed yet, show what the server has", which is what
   * makes selecting another row, saving, and reverting all the same gesture —
   * drop the draft — instead of three copies of the same state to keep in
   * step with the selection.
   */
  const values = draft ?? (selected ? toDraft(selected) : null);

  const tree = useMemo(() => buildTree(nodes ?? []), [nodes]);
  const rows = useMemo(() => flatten(tree), [tree]);

  /**
   * Hand-written pages that have no anchor row yet.
   *
   * Listed even though they are not in the tree, because otherwise there is
   * nothing to click: "add a sub-page under Игрокам" has to start somewhere,
   * and a page that exists as a file is invisible to a manager that only
   * renders rows. Once attached, the page joins the list above as a normal
   * branch and disappears from here.
   */
  const unattached = useMemo(() => {
    if (!nodes) return [];
    const taken = new Set(nodes.map((node) => node.path));
    return CODE_PAGE_SLUGS.filter((slug) => !taken.has(`/${slug}`));
  }, [nodes]);

  /* --- Structure -------------------------------------------------------- */

  const siblingsOf = useCallback(
    (node: SiteNode): SiteNode[] =>
      (nodes ?? [])
        .filter((candidate) => candidate.parentId === node.parentId)
        .sort((a, b) => a.position - b.position || a.id - b.id),
    [nodes],
  );

  const move = useCallback(
    async (id: number, parentId: number | null, beforeId: number | null) => {
      const body = await request({
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'move', id, parentId, beforeId }),
      });
      if (body?.nodes) {
        setNodes(body.nodes as SiteNode[]);
        setChanged(true);
      }
    },
    [request],
  );

  const add = useCallback(
    async (parentId: number | null, kind: NodeKind) => {
      const label = window.prompt(
        parentId === null ? 'Название нового пункта меню' : 'Название новой страницы',
        '',
      );
      if (!label?.trim()) return;

      const body = await request({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          parentId,
          kind,
          // Typed in the language the admin is working in; the other language
          // falls back to it until someone fills it in.
          titles: { [active]: label.trim() },
          inNav: parentId === null,
        }),
      });
      if (!body?.node) return;
      setChanged(true);
      await reload();
      setDraft(null);
      setSelectedId((body.node as SiteNode).id);
    },
    [active, reload, request],
  );

  /**
   * Add a sub-page under a hand-written route.
   *
   * Two steps, because the tree has no row for `/players` until someone wants
   * one: create (or find) the anchor, then add the page under it. The admin
   * sees one action — this is what makes "подраздел для страницы Игрокам" the
   * same gesture as adding a page anywhere else.
   */
  const addUnderCodePage = useCallback(
    async (slug: string, label: string) => {
      const attached = await request({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'attach-code-page',
          slug,
          // The working language only, like every other create here. The other
          // locale falls back to it until someone fills it in, which is better
          // than writing a Russian label into the English breadcrumb trail and
          // calling it translated.
          titles: { [active]: label },
        }),
      });
      if (!attached?.node) return;
      setChanged(true);
      await add((attached.node as SiteNode).id, 'article');
    },
    [active, add, request],
  );

  const remove = useCallback(
    async (node: TreeNode) => {
      const inside = flatten(node.children).length;
      const ok = window.confirm(
        `Удалить «${nodeTitle(node, active)}»?` +
          (inside ? `\n\nВнутри ещё ${inside} — удалится вместе с разделом.` : '') +
          '\n\nСодержимое страниц из конструктора тоже удалится. Это не отменяется.',
      );
      if (!ok) return;

      const body = await request({ method: 'DELETE', url: `/api/site-tree?id=${node.id}` });
      if (!body) return;
      setChanged(true);
      setDraft(null);
      setSelectedId(null);
      await reload();
    },
    [active, reload, request],
  );

  const saveDraft = useCallback(async () => {
    if (!selected || !values) return;
    const body = await request({
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: selected.id, ...values }),
    });
    if (!body?.node) return;
    setChanged(true);
    // Drop the draft so the fields fall back to what the server just stored —
    // including a slug it may have adjusted to keep the path unique.
    setDraft(null);
    await reload();
  }, [reload, request, selected, values]);

  const close = useCallback(() => {
    // The header, the routes and every page path may have moved. The page on
    // screen was rendered before that, so the honest thing is to fetch it again
    // rather than to leave a stale one that mostly works.
    if (changed) window.location.reload();
    else onClose();
  }, [changed, onClose]);

  const dirty = Boolean(selected && draft && JSON.stringify(toDraft(selected)) !== JSON.stringify(draft));

  return (
    <Modal
      title="Разделы сайта"
      onClose={close}
      actions={
        <button type="button" className={styles.btn} onClick={() => void add(null, 'category')}>
          <Plus size={14} />
          Пункт меню
        </button>
      }
    >
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.treeWrap}>
        <div className={styles.treeCol}>
          {nodes === null ? (
            <p className={styles.treeEmpty}>
              <Loader size={14} /> Загружаю…
            </p>
          ) : rows.length === 0 ? (
            <p className={styles.treeEmpty}>
              Пока ни одного раздела. «Пункт меню» наверху создаёт первый.
            </p>
          ) : (
            rows.map((node) => {
              const siblings = siblingsOf(node);
              const index = siblings.findIndex((item) => item.id === node.id);
              const parent = nodes.find((item) => item.id === node.parentId) ?? null;
              const grandparentChildren = parent
                ? nodes
                    .filter((item) => item.parentId === parent.parentId)
                    .sort((a, b) => a.position - b.position || a.id - b.id)
                : [];
              const parentIndex = parent
                ? grandparentChildren.findIndex((item) => item.id === parent.id)
                : -1;

              return (
                <div
                  key={node.id}
                  className={`${styles.treeRow} ${node.id === selectedId ? styles.treeRowOn : ''}`}
                  style={{ paddingLeft: 8 + Math.min(node.depth, 6) * 16 }}
                >
                  <button
                    type="button"
                    className={styles.treeName}
                    onClick={() => {
                      setSelectedId(node.id);
                      setDraft(null);
                    }}
                  >
                    {node.codePage ? (
                      <FileCode size={14} />
                    ) : node.kind === 'article' ? (
                      <FileText size={14} />
                    ) : (
                      <Folder size={14} />
                    )}
                    <span className={styles.treeLabel}>{nodeTitle(node, active)}</span>
                    {node.codePage ? <span className={styles.treeBadge}>страница сайта</span> : null}
                    {node.inNav ? <span className={styles.treeBadge}>меню</span> : null}
                    {node.hidden ? <EyeOff size={12} /> : null}
                    {node.kind === 'article' && node.views > 0 ? (
                      <span className={styles.treeViews}>
                        <Eye size={11} />
                        {node.views}
                      </span>
                    ) : null}
                  </button>

                  <div className={styles.treeTools}>
                    <button
                      type="button"
                      className={styles.nodeTool}
                      title="Добавить страницу внутрь"
                      onClick={() => void add(node.id, 'article')}
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      type="button"
                      className={styles.nodeTool}
                      title="Выше"
                      disabled={busy || index <= 0}
                      onClick={() => void move(node.id, node.parentId, siblings[index - 1].id)}
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      className={styles.nodeTool}
                      title="Ниже"
                      disabled={busy || index < 0 || index >= siblings.length - 1}
                      onClick={() =>
                        void move(node.id, node.parentId, siblings[index + 2]?.id ?? null)
                      }
                    >
                      <ChevronDown size={13} />
                    </button>
                    <button
                      type="button"
                      className={styles.nodeTool}
                      title="Вложить в предыдущий"
                      // A code page is pinned to its route: nesting it would
                      // move every sub-page to a URL no file answers.
                      disabled={busy || index <= 0 || node.codePage}
                      onClick={() => void move(node.id, siblings[index - 1].id, null)}
                    >
                      <IndentIncrease size={13} />
                    </button>
                    <button
                      type="button"
                      className={styles.nodeTool}
                      title="Вынести на уровень выше"
                      disabled={busy || !parent || node.codePage}
                      onClick={() =>
                        void move(
                          node.id,
                          parent?.parentId ?? null,
                          grandparentChildren[parentIndex + 1]?.id ?? null,
                        )
                      }
                    >
                      <IndentDecrease size={13} />
                    </button>
                    <a
                      className={styles.nodeTool}
                      href={`/${locale}${node.path}`}
                      title="Открыть страницу"
                    >
                      <SquareArrowOutUpRight size={13} />
                    </a>
                    <button
                      type="button"
                      className={`${styles.nodeTool} ${styles.nodeToolDanger}`}
                      title="Удалить"
                      disabled={busy}
                      onClick={() => void remove(node)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {unattached.length ? (
            <div className={styles.treeAttach}>
              <p className={styles.groupTitle}>Страницы сайта</p>
              <p className={styles.hint}>
                Эти страницы собраны кодом, поэтому их нет в списке выше. Кнопка добавляет внутрь
                такой страницы подраздел: он получит адрес вида /players/…, попадёт в выпадающее
                меню и в список внизу самой страницы.
              </p>
              {unattached.map((slug) => (
                <div key={slug} className={styles.treeRow}>
                  <span className={`${styles.treeName} ${styles.treeNameStatic}`}>
                    <FileCode size={14} />
                    <span className={styles.treeLabel}>{nav(slug)}</span>
                    <code className={styles.treeSlug}>/{slug}</code>
                  </span>
                  <div className={styles.treeTools}>
                    <button
                      type="button"
                      className={styles.nodeTool}
                      title="Добавить подраздел внутрь этой страницы"
                      disabled={busy}
                      onClick={() => void addUnderCodePage(slug, nav(slug))}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.treeForm}>
          {selected && values ? (
            <>
              <p className={styles.groupTitle}>
                <code className={styles.barPath}>{selected.path}</code>
              </p>

              {locales.map((l) => (
                <Field key={`title-${l}`} label={`Название (${l.toUpperCase()})`}>
                  <TextInput
                    value={values.titles[l] ?? ''}
                    onChange={(value) =>
                      setDraft({ ...values, titles: { ...values.titles, [l]: value } })
                    }
                  />
                </Field>
              ))}

              {locales.map((l) => (
                <Field key={`summary-${l}`} label={`Описание (${l.toUpperCase()})`}>
                  <textarea
                    className={styles.textarea}
                    rows={2}
                    value={values.summaries[l] ?? ''}
                    onChange={(event) =>
                      setDraft({
                        ...values,
                        summaries: { ...values.summaries, [l]: event.target.value },
                      })
                    }
                  />
                </Field>
              ))}

              {selected.codePage ? (
                <p className={styles.hint}>
                  Это страница сайта, собранная кодом. Здесь она нужна только как место для
                  подразделов: адрес и тип менять нельзя, содержимое правится конструктором прямо
                  на самой странице. Название и описание используются в хлебных крошках подразделов
                  и в выпадающем меню.
                </p>
              ) : (
                <>
                  <Field label="Адрес (латиницей)">
                    <TextInput
                      value={values.slug}
                      onChange={(value) => setDraft({ ...values, slug: value })}
                    />
                  </Field>

                  <Field label="Тип страницы">
                    <Segmented
                      value={values.kind}
                      options={KIND_OPTIONS}
                      onChange={(kind) => setDraft({ ...values, kind })}
                    />
                  </Field>
                </>
              )}

              {selected.parentId === null && !selected.codePage ? (
                <Check
                  checked={values.inNav}
                  onChange={(inNav) => setDraft({ ...values, inNav })}
                  label="Показывать в меню сайта"
                />
              ) : null}

              <Check
                checked={values.openByDefault}
                onChange={(openByDefault) => setDraft({ ...values, openByDefault })}
                label="Раскрыт в списке по умолчанию"
              />

              <Check
                checked={values.hidden}
                onChange={(hidden) => setDraft({ ...values, hidden })}
                label="Скрыть от посетителей"
              />

              <div className={styles.treeActions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={busy || !dirty}
                  onClick={() => void saveDraft()}
                >
                  {busy ? <Loader size={14} /> : null}
                  Сохранить
                </button>
                {dirty ? (
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => setDraft(null)}
                  >
                    Отменить
                  </button>
                ) : null}
              </div>

              <p className={styles.hint}>
                Содержимое страницы наполняется конструктором: откройте её и нажмите «Конструктор».
                Смена адреса переносит и уже собранные секции.
              </p>
            </>
          ) : (
            <p className={styles.treeEmpty}>Выберите раздел слева.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
