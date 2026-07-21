import { REASONER, PROMPT_VERSION } from '../config.js'
import { PROMPT_SUPPORT, PROMPT_FLIP, fill } from './prompts.js'
import { cacheKey } from './cache.js'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

// The key is held in React state only. It is never written to localStorage,
// sessionStorage, or a cookie, and it does not survive a page reload.
async function call(apiKey, body) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Ambiguity in Guardrails',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`${res.status} ${detail.slice(0, 200)}`)
  }
  return res.json()
}

async function runGuard(apiKey, guardId, text) {
  const data = await call(apiKey, {
    model: guardId,
    messages: [{ role: 'user', content: text }],
    max_tokens: 16,
    temperature: 0,
  })
  const out = (data.choices?.[0]?.message?.content || '').trim().toLowerCase()
  return { verdict: out.startsWith('unsafe') ? 'unsafe' : 'safe', p_unsafe: null }
}

async function runReasoner(apiKey, prompt) {
  const data = await call(apiKey, {
    model: REASONER.id,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 800,
    temperature: 0,
  })
  const raw = (data.choices?.[0]?.message?.content || '').trim()
  const json = raw.replace(/^```(?:json)?/, '').replace(/```$/, '').trim()
  return JSON.parse(json)
}

// Full per-instance flow, design doc section 4.1:
//   G(original) -> Prompt 1 -> G(+support) -> Prompt 2 -> G(+flip)
export async function runInstance({ apiKey, guardId, text, meta = {}, onStage }) {
  const stage = (s) => onStage && onStage(s)

  stage('Running guard on the original')
  const original = await runGuard(apiKey, guardId, text)
  const prediction = original.verdict
  const args = { P: text, prediction }

  stage('Reconstructing the supporting assumption')
  const support = await runReasoner(apiKey, fill(PROMPT_SUPPORT, args))

  stage('Running guard on the supporting injection')
  const supportRun = support.injection
    ? await runGuard(apiKey, guardId, support.injection)
    : null

  stage('Looking for a plausible flip')
  const flip = await runReasoner(apiKey, fill(PROMPT_FLIP, args))

  stage('Running guard on the flipping injection')
  const flipRun = flip.injection
    ? await runGuard(apiKey, guardId, flip.injection)
    : null

  const level = flip.assumption
    ? `defeasibly_${prediction}`
    : `robustly_${prediction}`


  return {
    key: await cacheKey(text, guardId),
    instance: text,
    safety_type: meta.safety_type ?? null,
    ground_truth: meta.ground_truth ?? null,
    guard: guardId,
    reasoner: REASONER.id,
    prompt_version: PROMPT_VERSION,
    fixture: false,
    live: true,
    original,
    support: {
      assumption: support.assumption ?? null,
      injection: support.injection ?? null,
      role: support.role ?? null,
      run: supportRun,
      // Prompt 1's injection should NOT move the verdict. If it does, G is
      // not relying on the reason its own verdict implies (consistency arm).
      inconsistent: supportRun ? supportRun.verdict !== prediction : null,
    },
    flip: {
      assumption: flip.assumption ?? null,
      injection: flip.injection ?? null,
      role: flip.role ?? null,
      run: flipRun,
      moved: flipRun ? flipRun.verdict !== prediction : null,
    },
    level,
    error: null,
  }
}
