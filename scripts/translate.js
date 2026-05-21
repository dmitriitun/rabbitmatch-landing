#!/usr/bin/env node

/**
 * Incremental EN → RU translation script for the RabbitMatch landing.
 *
 * Reads `messages/en.json` and updates `messages/ru.json` in place, calling
 * Microsoft Azure Translator for any key that is missing OR whose English
 * source has changed since the last run.
 *
 * The "what was translated last time" state lives in
 * `messages/.translation-cache.json` and is committed alongside ru.json
 * so the next run can compare against the last translated English value.
 *
 * Usage:
 *   npm run translate
 *
 * Required env:
 *   AZURE_TRANSLATOR_KEY    — Azure Translator subscription key
 *   AZURE_TRANSLATOR_REGION — Azure region (e.g. "westeurope")
 */

const fs = require('node:fs');
const path = require('node:path');

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');
const SOURCE_LANG = 'en';
const TARGET_LANG = 'ru';
const SOURCE_FILE = path.join(MESSAGES_DIR, `${SOURCE_LANG}.json`);
const TARGET_FILE = path.join(MESSAGES_DIR, `${TARGET_LANG}.json`);
const CACHE_FILE = path.join(MESSAGES_DIR, '.translation-cache.json');

const AZURE_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';
const AZURE_API_VERSION = '3.0';
const RATE_LIMIT_MS = 100;
const BATCH_SIZE = 25;

// ------------------------------------------------------------------
// JSON tree helpers
// ------------------------------------------------------------------

/**
 * Flatten a nested object into a `{ "a.b.c": leaf }` map. Arrays are
 * flattened with numeric indices, e.g. `arr.0`, `arr.1`. Leaves are
 * primitive values (string / number / boolean / null).
 */
function flatten(obj, prefix = '', out = {}) {
  if (Array.isArray(obj)) {
    obj.forEach((value, i) => flatten(value, prefix ? `${prefix}.${i}` : String(i), out));
    return out;
  }
  if (obj !== null && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      flatten(obj[key], prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  out[prefix] = obj;
  return out;
}

/**
 * Inverse of `flatten`. Reconstructs nested objects (and arrays where
 * keys are pure non-negative integers).
 */
function unflatten(flat) {
  const root = {};
  for (const compoundKey of Object.keys(flat)) {
    const parts = compoundKey.split('.');
    let cursor = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];
      const nextIsIndex = /^\d+$/.test(nextPart);
      if (cursor[part] === undefined) {
        cursor[part] = nextIsIndex ? [] : {};
      }
      cursor = cursor[part];
    }
    cursor[parts[parts.length - 1]] = flat[compoundKey];
  }
  return root;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw err;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ------------------------------------------------------------------
// Azure Translator
// ------------------------------------------------------------------

/**
 * Translate up to BATCH_SIZE strings in one API call. Preserves
 * `{placeholder}` and `{{placeholder}}` tokens by swapping them for
 * inert markers before translation and restoring them afterwards.
 */
async function translateBatch(texts, fromLang, toLang) {
  if (texts.length === 0) return [];

  const apiKey = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  if (!apiKey || !region) {
    throw new Error('AZURE_TRANSLATOR_KEY / AZURE_TRANSLATOR_REGION are not set');
  }

  const masked = texts.map((text) => maskPlaceholders(text));
  const url =
    `${AZURE_ENDPOINT}/translate` +
    `?api-version=${AZURE_API_VERSION}` +
    `&from=${encodeURIComponent(fromLang)}` +
    `&to=${encodeURIComponent(toLang)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Ocp-Apim-Subscription-Region': region,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(masked.map((entry) => ({ Text: entry.masked }))),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Azure API ${res.status}: ${body}`);
  }

  const json = await res.json();
  return masked.map((entry, i) => {
    const t = json?.[i]?.translations?.[0]?.text;
    if (typeof t !== 'string') {
      throw new Error(`Unexpected Azure response shape for index ${i}`);
    }
    return unmaskPlaceholders(t, entry.placeholders);
  });
}

const PLACEHOLDER_RE = /\{\{[^{}]+\}\}|\{[^{}]+\}/g;
const MARKER_PREFIX = '___RM_PH_';
const MARKER_SUFFIX = '___';

function maskPlaceholders(text) {
  const placeholders = [];
  const masked = text.replace(PLACEHOLDER_RE, (match) => {
    placeholders.push(match);
    return `${MARKER_PREFIX}${placeholders.length - 1}${MARKER_SUFFIX}`;
  });
  return { masked, placeholders };
}

function unmaskPlaceholders(text, placeholders) {
  let result = text;
  placeholders.forEach((original, idx) => {
    const marker = new RegExp(`${MARKER_PREFIX}${idx}${MARKER_SUFFIX}`, 'g');
    result = result.replace(marker, original);
  });
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

function shouldTranslate(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function main() {
  if (!process.env.AZURE_TRANSLATOR_KEY) {
    console.error('[translate] AZURE_TRANSLATOR_KEY is not set');
    process.exit(1);
  }
  if (!process.env.AZURE_TRANSLATOR_REGION) {
    console.error('[translate] AZURE_TRANSLATOR_REGION is not set');
    process.exit(1);
  }

  console.log('[translate] reading source:', SOURCE_FILE);
  const sourceTree = readJson(SOURCE_FILE);
  const targetTree = readJson(TARGET_FILE, {});
  const cache = readJson(CACHE_FILE, {});

  const sourceFlat = flatten(sourceTree);
  const targetFlat = flatten(targetTree);

  /** @type {{ key: string, source: string }[]} */
  const todo = [];

  for (const [key, value] of Object.entries(sourceFlat)) {
    if (!shouldTranslate(value)) {
      // Pass non-string leaves through verbatim (numbers, booleans, null).
      targetFlat[key] = value;
      continue;
    }
    const existing = targetFlat[key];
    const cached = cache[key];
    const missing = typeof existing !== 'string' || existing.trim() === '';
    const sourceChanged = cached !== value;
    if (missing || sourceChanged) {
      todo.push({ key, source: value });
    }
  }

  // Prune target keys that no longer exist in source.
  let pruned = 0;
  for (const key of Object.keys(targetFlat)) {
    if (!(key in sourceFlat)) {
      delete targetFlat[key];
      delete cache[key];
      pruned += 1;
    }
  }

  console.log(`[translate] source keys: ${Object.keys(sourceFlat).length}`);
  console.log(`[translate] to translate: ${todo.length}`);
  console.log(`[translate] pruned obsolete keys: ${pruned}`);

  if (todo.length === 0 && pruned === 0) {
    console.log('[translate] nothing to do');
    return;
  }

  let translated = 0;
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    const texts = batch.map((entry) => entry.source);
    console.log(`[translate] batch ${i / BATCH_SIZE + 1}: ${batch.length} key(s)`);

    try {
      const results = await translateBatch(texts, SOURCE_LANG, TARGET_LANG);
      results.forEach((value, idx) => {
        const { key, source } = batch[idx];
        targetFlat[key] = value;
        cache[key] = source;
        translated += 1;
      });
    } catch (err) {
      console.error(`[translate] batch failed: ${err.message}`);
      // Fall back to per-item so a single bad string doesn't lose the whole batch.
      for (const entry of batch) {
        try {
          const [single] = await translateBatch([entry.source], SOURCE_LANG, TARGET_LANG);
          targetFlat[entry.key] = single;
          cache[entry.key] = entry.source;
          translated += 1;
        } catch (innerErr) {
          console.error(`[translate]   key ${entry.key} failed: ${innerErr.message}`);
        }
      }
    }

    if (i + BATCH_SIZE < todo.length) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  const nextTarget = unflatten(targetFlat);
  writeJson(TARGET_FILE, nextTarget);
  writeJson(CACHE_FILE, cache);

  console.log(`[translate] wrote ${TARGET_FILE} (${translated} translation(s))`);
  console.log(`[translate] wrote ${CACHE_FILE}`);
}

main().catch((err) => {
  console.error('[translate] crashed:', err);
  process.exit(1);
});
