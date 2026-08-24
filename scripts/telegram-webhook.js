#!/usr/bin/env node

/**
 * Register (or inspect, or remove) the Telegram webhook for the site chat.
 *
 * Telegram delivers updates by calling a URL you register once; there is no
 * dashboard for it, which is why this script exists. Run it after every change
 * to the public URL or the webhook secret.
 *
 * Usage:
 *   node scripts/telegram-webhook.js set     # register the webhook
 *   node scripts/telegram-webhook.js info    # show what Telegram has stored
 *   node scripts/telegram-webhook.js delete  # unregister
 *
 * Required env (read from .env.local when present):
 *   TELEGRAM_BOT_TOKEN
 *   NEXT_PUBLIC_APP_URL       — public https origin of this site
 *   TELEGRAM_WEBHOOK_SECRET   — optional but strongly recommended
 */

const fs = require('node:fs');
const path = require('node:path');

// Minimal .env.local reader — this script runs outside Next, which is what
// normally loads those files.
function loadEnvLocal() {
  const file = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

async function main() {
  loadEnvLocal();

  const action = process.argv[2] || 'info';
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not set.');
    process.exit(1);
  }

  const api = (method, payload) =>
    fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    }).then((r) => r.json());

  if (action === 'info') {
    console.log(JSON.stringify(await api('getWebhookInfo'), null, 2));
    return;
  }

  if (action === 'delete') {
    console.log(JSON.stringify(await api('deleteWebhook', { drop_pending_updates: false }), null, 2));
    return;
  }

  if (action !== 'set') {
    console.error(`Unknown action "${action}". Use set | info | delete.`);
    process.exit(1);
  }

  const origin = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (!/^https:\/\//.test(origin)) {
    console.error('NEXT_PUBLIC_APP_URL must be set to the public https origin.');
    process.exit(1);
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('WARNING: TELEGRAM_WEBHOOK_SECRET is not set — the webhook will accept unsigned posts.');
  }

  const result = await api('setWebhook', {
    url: `${origin}/api/telegram/webhook`,
    // Only messages matter; skipping the rest keeps traffic to the container low.
    allowed_updates: ['message', 'edited_message'],
    ...(secret ? { secret_token: secret } : {}),
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
