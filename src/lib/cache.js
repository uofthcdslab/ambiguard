import { BASE, PROMPT_VERSION, REASONER } from '../config.js'

// Must produce byte-identical output to cache_key() in scripts/run_precompute.py.
// Any drift here silently turns every cache hit into a live API call.
export async function cacheKey(text, guardId) {
  const normalised = text.trim().replace(/\s+/g, ' ')
  const raw = [normalised, guardId, REASONER.id, PROMPT_VERSION].join('|')
  const bytes = new TextEncoder().encode(raw)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

let indexPromise = null

export function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch(`${BASE}precomputed/index.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
  }
  return indexPromise
}

export async function lookup(text, guardId) {
  const key = await cacheKey(text, guardId)
  const index = await loadIndex()
  if (!index[key]) return null
  try {
    const r = await fetch(`${BASE}precomputed/${key}.json`)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}
