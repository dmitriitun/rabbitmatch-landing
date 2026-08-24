'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MessageCircle, Send, X } from 'lucide-react';
import { TelegramIcon } from '@/components/icons/TelegramIcon';
import { tap } from '@/lib/haptics';
import styles from './ChatWidget.module.css';

type Message = {
  id: number;
  direction: 'in' | 'out';
  body: string;
  author_name: string | null;
  created_at: string;
};

const TOKEN_KEY = 'rm_chat_token';
const POLL_MS = 5000;

function readToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* private mode — the thread simply will not survive a reload */
  }
}

/**
 * `localStorage` is an external store, so it is read through
 * `useSyncExternalStore` rather than in an effect: the server snapshot is
 * `null` (there is no storage during SSR) and the client picks up the real
 * value during hydration without an extra render pass.
 */
const tokenStore = {
  subscribe(onChange: () => void) {
    // Only another tab can change the stored token behind our back.
    window.addEventListener('storage', onChange);
    return () => window.removeEventListener('storage', onChange);
  },
  getSnapshot: () => readToken(),
  getServerSnapshot: () => null,
};

/**
 * Support chat bridged to Telegram.
 *
 * Nothing here runs until the visitor opens the widget: the launcher is a
 * button, the transcript is only fetched on open, and polling stops when the
 * panel closes or the tab goes to the background. That matters because this is
 * the only always-on client feature on an otherwise static site.
 */
export function ChatWidget() {
  const t = useTranslations('chat');
  const locale = useLocale();

  const [open, setOpen] = useState(false);
  const storedToken = useSyncExternalStore(
    tokenStore.subscribe,
    tokenStore.getSnapshot,
    tokenStore.getServerSnapshot,
  );
  // Set once the server issues a token for this conversation; until then the
  // stored value from a previous visit is used.
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const token = issuedToken ?? storedToken;
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Empty is how an unset key looks in `.env.local`, and an empty href would
  // render a link that navigates to the current page.
  const botUrl = process.env.NEXT_PUBLIC_SUPPORT_BOT_URL?.trim() || null;
  const started = token !== null || messages.length > 0;

  const poll = useCallback(async (activeToken: string) => {
    try {
      const res = await fetch(
        `/api/chat/messages?token=${encodeURIComponent(activeToken)}&after=${lastIdRef.current}`,
        { cache: 'no-store' },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { messages: Message[] };
      if (!data.messages.length) return;
      lastIdRef.current = data.messages[data.messages.length - 1].id;
      setMessages((prev) => [...prev, ...data.messages]);
    } catch {
      /* transient — the next tick retries */
    }
  }, []);

  // Poll only while the panel is open and the tab is visible.
  useEffect(() => {
    if (!open || !token) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      void poll(token);
      timer = setInterval(() => void poll(token), POLL_MS);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [open, token, poll]);

  // Keep the transcript pinned to the newest message.
  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;

    tap();
    setSending(true);
    setError(false);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          text,
          name: name.trim() || undefined,
          locale,
          page: window.location.pathname,
        }),
      });

      if (!res.ok) {
        setError(true);
        return;
      }

      const data = (await res.json()) as { token: string; message: Message };
      if (data.token !== token) {
        writeToken(data.token);
        setIssuedToken(data.token);
      }
      lastIdRef.current = data.message.id;
      setMessages((prev) => [...prev, data.message]);
      setDraft('');
    } catch {
      setError(true);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [draft, locale, name, sending, token]);

  return (
    <>
      <button
        type="button"
        className={styles.launcher}
        aria-label={open ? t('closeLabel') : t('openLabel')}
        aria-expanded={open}
        aria-controls="rm-chat-panel"
        onClick={() => {
          tap();
          setOpen((v) => !v);
        }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      <div
        id="rm-chat-panel"
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
        role="dialog"
        aria-label={t('title')}
        inert={!open}
      >
        <header className={styles.head}>
          <div className={styles.headText}>
            <p className={styles.headTitle}>{t('title')}</p>
            <p className={styles.headSubtitle}>{t('subtitle')}</p>
          </div>
          <button
            type="button"
            className={styles.headClose}
            aria-label={t('closeLabel')}
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </header>

        <div className={styles.body} ref={listRef}>
          {!started ? <p className={styles.intro}>{t('intro')}</p> : null}

          <ul className={styles.messages}>
            {messages.map((message) => (
              <li
                key={message.id}
                className={`${styles.message} ${
                  message.direction === 'in' ? styles.messageIn : styles.messageOut
                }`}
              >
                <span className={styles.messageAuthor}>
                  {message.direction === 'in' ? t('you') : message.author_name || t('team')}
                </span>
                <span className={styles.messageBody}>{message.body}</span>
              </li>
            ))}
          </ul>
        </div>

        <form
          className={styles.composer}
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {!started ? (
            <input
              type="text"
              className={styles.nameInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              aria-label={t('nameLabel')}
              autoComplete="name"
            />
          ) : null}

          <div className={styles.composerRow}>
            <textarea
              ref={inputRef}
              className={styles.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={t('placeholder')}
              rows={1}
              maxLength={2000}
              aria-label={t('placeholder')}
            />
            <button
              type="submit"
              className={styles.send}
              disabled={sending || !draft.trim()}
              aria-label={t('send')}
            >
              <Send size={18} />
            </button>
          </div>

          {error ? <p className={styles.error}>{t('error')}</p> : null}

          {botUrl ? (
            <a
              href={botUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.telegramLink}
            >
              <TelegramIcon size={16} />
              <span>{t('telegramCta')}</span>
            </a>
          ) : null}

          <p className={styles.consent}>{t('consent')}</p>
        </form>
      </div>
    </>
  );
}
