// Single source of truth for models. scripts/run_precompute.py holds the same
// ids -- keep them in sync or every cache lookup will miss.

export const BASE = import.meta.env.BASE_URL

export const GUARDS = [
  {
    id: 'meta-llama/llama-guard-4-12b',
    label: 'Llama Guard 4 12B',
    // Set to true once you have verified this guard returns logprobs on a
    // pinned provider. While false, the threshold slider is disabled.
    logprobs: false,
  },
  { id: 'meta-llama/llama-guard-3-8b', label: 'Llama Guard 3 8B', logprobs: false },
  { id: 'google/shieldgemma-9b', label: 'ShieldGemma 9B', logprobs: false },
]

export const REASONER = {
  id: 'anthropic/claude-sonnet-4.6',
  label: 'Claude Sonnet 4.6',
}

export const PROMPT_VERSION = 'v1'

// Left-to-right order of the four level columns.
export const LEVELS = [
  { key: 'robustly_unsafe',   cls: 'ru', short: 'Robustly unsafe' },
  { key: 'defeasibly_unsafe', cls: 'du', short: 'Defeasibly unsafe' },
  { key: 'defeasibly_safe',   cls: 'ds', short: 'Defeasibly safe' },
  { key: 'robustly_safe',     cls: 'rs', short: 'Robustly safe' },
]

export const MAX_LIVE_INSTANCES = 5
