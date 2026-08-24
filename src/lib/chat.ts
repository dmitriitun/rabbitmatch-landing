import 'server-only';
import { randomBytes } from 'node:crypto';
import { query } from './db';

/**
 * Data layer for the site chat.
 *
 * A "thread" is one visitor's conversation. It is addressed by an opaque
 * server-issued token rather than by anything the browser chooses, so a thread
 * cannot be read or written by guessing an identifier.
 */

export type ChatThread = {
  id: number;
  token: string;
  name: string | null;
  contact: string | null;
  locale: string | null;
  telegram_chat_id: string | null;
  telegram_topic_id: number | null;
  status: string;
};

export type ChatMessage = {
  id: number;
  direction: 'in' | 'out';
  body: string;
  author_name: string | null;
  created_at: string;
};

export const MAX_MESSAGE_LENGTH = 2000;

export function newToken(): string {
  return randomBytes(24).toString('base64url');
}

export async function createThread(input: {
  name: string | null;
  contact: string | null;
  locale: string | null;
  page: string | null;
  ip: string | null;
  userAgent: string | null;
}): Promise<ChatThread> {
  const token = newToken();
  const { rows } = await query<ChatThread>(
    `INSERT INTO chat_threads (token, name, contact, locale, page, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, token, name, contact, locale, telegram_chat_id, telegram_topic_id, status`,
    [token, input.name, input.contact, input.locale, input.page, input.ip, input.userAgent],
  );
  return rows[0];
}

export async function findThreadByToken(token: string): Promise<ChatThread | null> {
  const { rows } = await query<ChatThread>(
    `SELECT id, token, name, contact, locale, telegram_chat_id, telegram_topic_id, status
     FROM chat_threads WHERE token = $1`,
    [token],
  );
  return rows[0] ?? null;
}

export async function findThreadByTopic(
  chatId: string,
  topicId: number,
): Promise<ChatThread | null> {
  const { rows } = await query<ChatThread>(
    `SELECT id, token, name, contact, locale, telegram_chat_id, telegram_topic_id, status
     FROM chat_threads
     WHERE telegram_chat_id = $1 AND telegram_topic_id = $2`,
    [chatId, topicId],
  );
  return rows[0] ?? null;
}

/**
 * Resolve a thread from the message a moderator replied to. This is the
 * fallback path for support chats that are not forum supergroups.
 */
export async function findThreadByTelegramMessage(
  telegramMessageId: number,
): Promise<ChatThread | null> {
  const { rows } = await query<ChatThread>(
    `SELECT t.id, t.token, t.name, t.contact, t.locale,
            t.telegram_chat_id, t.telegram_topic_id, t.status
     FROM chat_messages m
     JOIN chat_threads t ON t.id = m.thread_id
     WHERE m.telegram_message_id = $1
     LIMIT 1`,
    [telegramMessageId],
  );
  return rows[0] ?? null;
}

export async function attachTopic(
  threadId: number,
  chatId: string,
  topicId: number | null,
): Promise<void> {
  await query(
    `UPDATE chat_threads SET telegram_chat_id = $2, telegram_topic_id = $3 WHERE id = $1`,
    [threadId, chatId, topicId],
  );
}

export async function appendMessage(input: {
  threadId: number;
  direction: 'in' | 'out';
  body: string;
  authorName?: string | null;
  telegramMessageId?: number | null;
}): Promise<ChatMessage> {
  const { rows } = await query<ChatMessage>(
    `INSERT INTO chat_messages (thread_id, direction, body, author_name, telegram_message_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, direction, body, author_name, created_at`,
    [
      input.threadId,
      input.direction,
      input.body,
      input.authorName ?? null,
      input.telegramMessageId ?? null,
    ],
  );
  await query('UPDATE chat_threads SET last_message_at = NOW() WHERE id = $1', [input.threadId]);
  return rows[0];
}

export async function setTelegramMessageId(
  messageId: number,
  telegramMessageId: number,
): Promise<void> {
  await query('UPDATE chat_messages SET telegram_message_id = $2 WHERE id = $1', [
    messageId,
    telegramMessageId,
  ]);
}

export async function listMessages(threadId: number, afterId: number): Promise<ChatMessage[]> {
  const { rows } = await query<ChatMessage>(
    `SELECT id, direction, body, author_name, created_at
     FROM chat_messages
     WHERE thread_id = $1 AND id > $2
     ORDER BY id ASC
     LIMIT 100`,
    [threadId, afterId],
  );
  return rows;
}
