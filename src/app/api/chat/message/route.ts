import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  MAX_MESSAGE_LENGTH,
  appendMessage,
  attachTopic,
  createThread,
  findThreadByToken,
  setTelegramMessageId,
} from '@/lib/chat';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  createForumTopic,
  escapeHtml,
  sendMessage,
  supportChatId,
  telegramEnabled,
} from '@/lib/telegram';

export const dynamic = 'force-dynamic';

function str(body: unknown, key: string, max: number): string | null {
  const value = (body as Record<string, unknown>)[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/**
 * Visitor sends a message.
 *
 * The message is persisted first and relayed to Telegram second: if Telegram
 * is unreachable or misconfigured the visitor still gets a delivered message
 * and moderators can find it in the database, rather than the send failing and
 * the message being lost.
 */
export async function POST(request: Request): Promise<Response> {
  const limited = await enforceRateLimit('chat', 20, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const text = str(body, 'text', MAX_MESSAGE_LENGTH);
  if (!text) return NextResponse.json({ error: 'empty_message' }, { status: 400 });

  const token = str(body, 'token', 128);
  const locale = str(body, 'locale', 8);

  const h = await headers();
  const ip = h.get('cf-connecting-ip') || h.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const userAgent = h.get('user-agent')?.slice(0, 500) ?? null;

  let thread = token ? await findThreadByToken(token) : null;
  let isNew = false;

  if (!thread) {
    thread = await createThread({
      name: str(body, 'name', 120),
      contact: str(body, 'contact', 200),
      locale,
      page: str(body, 'page', 300),
      ip,
      userAgent,
    });
    isNew = true;
  }

  const stored = await appendMessage({
    threadId: thread.id,
    direction: 'in',
    body: text,
    authorName: thread.name,
  });

  if (telegramEnabled()) {
    const chatId = supportChatId() as string;

    // First message from this visitor: try to open a dedicated forum topic so
    // moderators get one thread per conversation.
    if (isNew || !thread.telegram_chat_id) {
      const topicName = [thread.name || 'Гость', locale ? `(${locale})` : '']
        .filter(Boolean)
        .join(' ');
      const topic = await createForumTopic(chatId, topicName);
      await attachTopic(thread.id, chatId, topic?.message_thread_id ?? null);
      thread.telegram_chat_id = chatId;
      thread.telegram_topic_id = topic?.message_thread_id ?? null;
    }

    const header = isNew
      ? [
          '💬 <b>Новое обращение с сайта</b>',
          thread.name ? `Имя: ${escapeHtml(thread.name)}` : null,
          thread.contact ? `Контакт: ${escapeHtml(thread.contact)}` : null,
          locale ? `Язык: ${escapeHtml(locale)}` : null,
          '',
          'Ответьте в этой теме — сообщение придёт посетителю на сайт.',
          '',
        ]
          .filter((line) => line !== null)
          .join('\n')
      : '';

    const sent = await sendMessage({
      chatId,
      topicId: thread.telegram_topic_id,
      text: `${header}${escapeHtml(text)}`,
    });

    // Remember the Telegram message id so a plain reply (in a non-forum chat)
    // can still be traced back to this thread.
    if (sent) await setTelegramMessageId(stored.id, sent.message_id);
  }

  return NextResponse.json({
    token: thread.token,
    message: stored,
  });
}
