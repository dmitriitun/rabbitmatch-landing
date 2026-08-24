import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  appendMessage,
  findThreadByTelegramMessage,
  findThreadByTopic,
} from '@/lib/chat';
import { displayName, supportChatId, type TelegramUpdate } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

/**
 * Telegram webhook.
 *
 * Moderators reply inside the support group and their replies land in the
 * visitor's chat widget. Two ways a reply is matched to a thread:
 *
 *  1. `message_thread_id` — the forum topic opened for that visitor. This is
 *     the normal path and needs no discipline from the moderator.
 *  2. `reply_to_message` — for support chats that are not forum supergroups,
 *     replying to the visitor's message resolves the thread through the stored
 *     Telegram message id.
 *
 * Anything else is ignored, so ordinary chatter in the group is not forwarded
 * to a website visitor by accident.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const h = await headers();
    if (h.get('x-telegram-bot-api-secret-token') !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    // Always 200 to Telegram: a non-2xx makes it retry the same bad update.
    return NextResponse.json({ ok: true });
  }

  const message = update.message ?? update.edited_message;
  if (!message) return NextResponse.json({ ok: true });

  // Service messages (topic created, members joined) carry no text.
  const text = (message.text ?? message.caption ?? '').trim();
  if (!text || message.forum_topic_created) return NextResponse.json({ ok: true });

  // Ignore anything the bot itself posted, or we would echo the visitor's own
  // message straight back at them.
  if (message.from?.is_bot) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const configured = supportChatId();
  if (configured && chatId !== configured) return NextResponse.json({ ok: true });

  let thread = null;
  if (message.message_thread_id) {
    thread = await findThreadByTopic(chatId, message.message_thread_id);
  }
  if (!thread && message.reply_to_message) {
    thread = await findThreadByTelegramMessage(message.reply_to_message.message_id);
  }
  if (!thread) return NextResponse.json({ ok: true });

  // Commands are for the moderators, not for the visitor.
  if (text.startsWith('/')) return NextResponse.json({ ok: true });

  await appendMessage({
    threadId: thread.id,
    direction: 'out',
    body: text.slice(0, 4000),
    authorName: displayName(message.from),
    telegramMessageId: message.message_id,
  });

  return NextResponse.json({ ok: true });
}
