'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import {
  ALLOWED_MIME,
  isVideoMime,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  toEmbedUrl,
  type MediaAsset,
} from '@/lib/builder/media';
import type { MediaKind } from '@/lib/builder/types';
import { editorStyles as styles, Field, Modal, TextInput } from './ui';

/**
 * Media library: upload, pick, delete, or point at something already hosted.
 *
 * Intrinsic dimensions are measured in the browser before upload and stored
 * with the asset. That is what lets the published `<img>` carry `width` and
 * `height` — the difference between a page that settles instantly and one
 * that jumps as each image arrives, which is a ranking signal as well as an
 * annoyance.
 */

export type MediaPick = {
  media: MediaKind;
  src: string;
  assetId?: string;
  width?: number;
  height?: number;
};

type Asset = MediaAsset & { url: string };

async function measure(file: File): Promise<{ width?: number; height?: number }> {
  const url = URL.createObjectURL(file);
  try {
    if (isVideoMime(file.type)) {
      return await new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight });
        video.onerror = () => resolve({});
        video.src = url;
      });
    }
    return await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve({});
      image.src = url;
    });
  } finally {
    // Revoked on the next tick so the element has had its chance to load.
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }
}

const ERRORS: Record<string, string> = {
  unsupported_type: 'Такой формат не принимается. Можно JPEG, PNG, WebP, AVIF, GIF, MP4, WebM.',
  too_large: 'Файл слишком большой.',
  forbidden: 'Нужны права администратора.',
  unauthorized: 'Сессия истекла — войдите заново.',
};

export function MediaPicker({
  onPick,
  onClose,
}: {
  onPick: (pick: MediaPick) => void;
  onClose: () => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/media');
        if (!res.ok) return;
        const data = (await res.json()) as { assets: Asset[] };
        if (!cancelled) setAssets(data.assets ?? []);
      } catch {
        /* the library simply stays empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      setBusy(true);
      try {
        for (const file of Array.from(files)) {
          if (!ALLOWED_MIME.includes(file.type)) {
            setError(ERRORS.unsupported_type);
            continue;
          }
          const limit = isVideoMime(file.type) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
          if (file.size > limit) {
            setError(`${ERRORS.too_large} Максимум ${Math.round(limit / 1024 / 1024)} МБ.`);
            continue;
          }

          const { width, height } = await measure(file);
          const form = new FormData();
          form.append('file', file);
          if (width) form.append('width', String(width));
          if (height) form.append('height', String(height));

          const res = await fetch('/api/media', { method: 'POST', body: form });
          const data = (await res.json().catch(() => ({}))) as { asset?: Asset; error?: string };
          if (!res.ok || !data.asset) {
            setError(ERRORS[data.error ?? ''] ?? 'Загрузить не удалось.');
            continue;
          }
          setAssets((prev) => [data.asset as Asset, ...prev.filter((a) => a.id !== data.asset!.id)]);
        }
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await fetch(`/api/media?id=${id}`, { method: 'DELETE' });
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const pickAsset = (asset: Asset) => {
    onPick({
      media: isVideoMime(asset.mime) ? 'video' : 'image',
      src: asset.url,
      assetId: asset.id,
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
    });
    onClose();
  };

  const pickUrl = () => {
    const value = url.trim();
    if (!value) return;
    const embed = toEmbedUrl(value);
    if (embed && embed !== value) {
      onPick({ media: 'embed', src: embed });
      onClose();
      return;
    }
    if (/\.(mp4|webm|mov)(\?|$)/i.test(value)) {
      onPick({ media: 'video', src: value });
    } else if (/\.(jpe?g|png|webp|avif|gif)(\?|$)/i.test(value)) {
      onPick({ media: 'image', src: value });
    } else {
      onPick({ media: 'embed', src: value });
    }
    onClose();
  };

  return (
    <Modal title="Медиа" onClose={onClose}>
      <div
        className={`${styles.dropzone} ${over ? styles.dropzoneOver : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
        }}
      >
        <Upload size={18} />
        <p>{busy ? 'Загружаю…' : 'Перетащите файлы сюда или нажмите, чтобы выбрать'}</p>
        <p className={styles.hint}>
          JPEG, PNG, WebP, AVIF, GIF до {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} МБ · MP4, WebM до{' '}
          {Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} МБ. Длинное видео лучше вставлять ссылкой.
        </p>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept={ALLOWED_MIME.join(',')}
          onChange={(e) => {
            if (e.target.files?.length) void upload(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.row}>
        <Field label="…или ссылка: YouTube, Vimeo, прямой URL картинки или видео">
          <TextInput value={url} onChange={setUrl} placeholder="https://…" />
        </Field>
        <button type="button" className={styles.btn} onClick={pickUrl} disabled={!url.trim()}>
          Вставить
        </button>
      </div>

      <div className={styles.assets}>
        {assets.map((asset) => (
          <div key={asset.id} className={styles.asset}>
            <button
              type="button"
              className={styles.assetBtn}
              onClick={() => pickAsset(asset)}
              title={asset.filename ?? asset.id}
            >
              {isVideoMime(asset.mime) ? (
                <video className={styles.assetThumb} src={asset.url} muted preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- library thumbnail
                <img className={styles.assetThumb} src={asset.url} alt="" />
              )}
              <span className={styles.assetMeta}>
                {asset.filename ?? asset.id.slice(0, 10)} · {Math.round(asset.size / 1024)} КБ
              </span>
            </button>
            <button
              type="button"
              className={styles.assetDelete}
              title="Удалить из библиотеки"
              onClick={() => void remove(asset.id)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {assets.length === 0 ? (
        <p className={styles.hint}>Библиотека пуста — загрузите первый файл.</p>
      ) : (
        <p className={styles.hint}>
          Удаление из библиотеки не убирает файл со страниц, где он уже вставлен: там останется
          битая ссылка. Сначала уберите его со страниц.
        </p>
      )}
    </Modal>
  );
}
