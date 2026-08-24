import 'server-only';

/**
 * Minimal Telegram Bot API client — only the four methods the support bridge
 * uses. A dependency would be more code than this, and it would drag a
 * polling loop into a process that only ever receives webhooks.
 */

const API = 'https://api.telegram.org';

export function botToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null;
}

export function supportChatId(): string | null {
  return process.env.TELEGRAM_SUPPORT_CHAT_ID ?? null;
}

/** Is the Telegram bridge configured at all? */
export function telegramEnabled(): boolean {
  return Boolean(botToken() && supportChatId());
}

type TgResponse<T> = { ok: true; result: T } | { ok: false; description?: string };

async function call<T>(method: string, payload: unknown): Promise<T | null> {
  const token = botToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      // Never let a slow Telegram call hold a request open — the visitor's
      // message is already persisted by the time we get here, so failing to
      // deliver it is recoverable, but a hung request is not.
      signal: AbortSignal.timeout(8_000),
    });
    const data = (await res.json()) as TgResponse<T>;
    if (!data.ok) {
      console.warn(`[telegram] ${method} failed: ${data.description ?? 'unknown error'}`);
      return null;
    }
    return data.result;
  } catch (err) {
    console.warn(`[telegram] ${method} threw`, err);
    return null;
  }
}

/** Escape the subset of characters Telegram's HTML parse mode treats specially. */
export function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export type ForumTopic = { message_thread_id: number; name: string };

/**
 * Create a forum topic for a new visitor.
 *
 * Requires the support chat to be a supergroup with Topics enabled and the bot
 * to be an admin with `can_manage_topics`. When that is not the case Telegram
 * returns an error, we get `null`, and the caller falls back to posting into
 * the group directly and matching replies by reply-to.
 */
export function createForumTopic(chatId: string, name: string): Promise<ForumTopic | null> {
  return call<ForumTopic>('createForumTopic', {
    chat_id: chatId,
    name: name.slice(0, 128),
  });
}

export type SentMessage = { message_id: number };

export function sendMessage(params: {
  chatId: string;
  text: string;
  topicId?: number | null;
  replyToMessageId?: number | null;
}): Promise<SentMessage | null> {
  return call<SentMessage>('sendMessage', {
    chat_id: params.chatId,
    text: params.text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(params.topicId ? { message_thread_id: params.topicId } : {}),
    ...(params.replyToMessageId ? { reply_to_message_id: params.replyToMessageId } : {}),
  });
}

/* --- Webhook update shapes (only the fields we read) --------------------- */

export type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TelegramMessage = {
  message_id: number;
  message_thread_id?: number;
  from?: TelegramUser;
  chat: { id: number | string; type: string };
  text?: string;
  caption?: string;
  reply_to_message?: { message_id: number };
  forum_topic_created?: unknown;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

/** Best display name for a Telegram sender. */
export function displayName(user: TelegramUser | undefined): string {
  if (!user) return 'Support';
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return full || (user.username ? `@${user.username}` : 'Support');
}
