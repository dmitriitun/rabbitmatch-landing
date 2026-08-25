/**
 * What the media library accepts, shared by the upload route and the editor.
 *
 * Uploads land in Postgres as `bytea` and are served back by
 * `/api/media/<sha256>`. Content-addressing means re-uploading the same file
 * is a no-op and the URL can be cached forever, which is what makes serving
 * bytes out of the database acceptable for a site this size: each asset is
 * fetched once per browser and then never again.
 *
 * SVG is deliberately absent. An SVG is a script host, and the one safe way to
 * accept user SVG is a sanitiser we would have to keep current forever — for a
 * format this site does not need from an upload form.
 */

export const IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

export const VIDEO_MIME = ['video/mp4', 'video/webm'] as const;

export const ALLOWED_MIME: readonly string[] = [...IMAGE_MIME, ...VIDEO_MIME];

/** 8 MB for stills. Anything larger belongs in an image editor first. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * 25 MB for clips. The cap is low on purpose: the bytes pass through the Node
 * process on every cache miss, and this container is billed by memory. Longer
 * footage should be embedded from a video host instead — the media picker
 * offers that as a first-class option.
 */
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export function isImageMime(mime: string): boolean {
  return (IMAGE_MIME as readonly string[]).includes(mime);
}

export function isVideoMime(mime: string): boolean {
  return (VIDEO_MIME as readonly string[]).includes(mime);
}

export function maxBytesFor(mime: string): number {
  return isVideoMime(mime) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

export function mediaUrl(id: string): string {
  return `/api/media/${id}`;
}

export type MediaAsset = {
  id: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  filename: string | null;
  alt: string | null;
  createdAt: string;
};

/**
 * Turn a pasted URL into an embeddable one.
 *
 * YouTube and Vimeo watch pages cannot be put in an `<iframe>`; their embed
 * URLs can. Anything else is returned untouched and rendered as a plain
 * iframe, which is what a self-hosted player or a map needs.
 */
export function toEmbedUrl(input: string): string | null {
  const value = input.trim();
  if (!/^https?:\/\//i.test(value)) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1);
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v');
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/shorts/')) {
      const id = url.pathname.split('/')[2];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
  }
  if (host === 'vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return /^\d+$/.test(id ?? '') ? `https://player.vimeo.com/video/${id}` : null;
  }

  return value;
}
