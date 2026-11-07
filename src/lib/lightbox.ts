import type { CollectionEntry } from 'astro:content';

/* Payload for <Lightbox />: put the result, JSON-encoded, in a `data-lb`
 * attribute on any button and clicking it opens the full-size viewer. */
export function lbData(
  e: CollectionEntry<'gallery'>,
  { description = true, start = 0 }: { description?: boolean; start?: number } = {},
) {
  return JSON.stringify({
    title: e.data.title,
    date: e.data.date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    iso: e.data.date.toISOString().slice(0, 10),
    description: description ? e.data.description : '',
    photos: e.data.photos.map(({ src, alt, caption }) => ({ src, alt, caption })),
    start,
  });
}
