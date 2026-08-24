import { NextResponse } from 'next/server';
import { findThreadByToken, listMessages } from '@/lib/chat';
import { enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Poll for new messages in a thread.
 *
 * Polling rather than SSE or WebSockets: the widget only polls while it is
 * open, so the cost is bounded by concurrent open widgets, whereas a
 * long-lived connection per visitor would pin memory in an always-on
 * container for people who left the tab in the background.
 */
export async function GET(request: Request): Promise<Response> {
  const limited = await enforceRateLimit('chat-poll', 90, 60_000);
  if (limited) return limited;

  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 });

  const afterRaw = Number(url.searchParams.get('after') ?? '0');
  const after = Number.isFinite(afterRaw) && afterRaw > 0 ? Math.floor(afterRaw) : 0;

  const thread = await findThreadByToken(token);
  // An unknown token is indistinguishable from an empty thread on purpose —
  // it gives nothing away about which tokens exist.
  if (!thread) return NextResponse.json({ messages: [] });

  const messages = await listMessages(thread.id, after);

  return NextResponse.json(
    { messages },
    { headers: { 'cache-control': 'no-store' } },
  );
}
