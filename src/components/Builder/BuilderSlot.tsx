import { getLocale } from 'next-intl/server';
import { loadBuilderDoc } from '@/lib/builder/store';
import type { Locale } from '@/i18n/config';
import type { SlotName } from '@/lib/builder/types';
import { BuilderSectionView, builderStyles } from './nodes';

/**
 * A place on a hand-written page where admin-composed sections may appear.
 *
 * A **server** component, like `EditableText`: the sections it renders are
 * plain HTML in the document a crawler downloads, and a visitor who never logs
 * in receives no builder JavaScript at all. The empty `data-rm-slot-mount`
 * div is the hook the editor portals its live canvas into once an admin turns
 * building on — until then it costs one empty element.
 */
export async function BuilderSlot({
  page,
  slot,
  locale,
}: {
  /** Route path without the locale prefix, e.g. `/` or `/players`. */
  page: string;
  slot: SlotName;
  locale?: Locale;
}) {
  const resolved = (locale ?? (await getLocale())) as Locale;
  const doc = await loadBuilderDoc(page, resolved);
  const sections = doc.sections.filter((section) => section.slot === slot);

  return (
    <div data-rm-slot={`${page}|${slot}`}>
      <div data-rm-slot-server="" className={builderStyles.frame}>
        {sections.map((section) => (
          <BuilderSectionView key={section.id} section={section} locale={resolved} />
        ))}
      </div>
      <div data-rm-slot-mount="" />
    </div>
  );
}
