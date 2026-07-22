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
  {
    id: 'openai/gpt-oss-safeguard-20b',
    label: 'GPT-OSS Safeguard 20B',
    logprobs: false,
  },
]

export const REASONERS = [
  { id: 'qwen/qwen3.7-plus', label: 'Qwen3.7 Plus' },
  { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6' },
]

export const PROMPT_VERSION = 'v2'

// Left-to-right order of the four level columns.
export const LEVELS = [
  { key: 'robustly_unsafe',   cls: 'ru', short: 'Robustly unsafe' },
  { key: 'defeasibly_unsafe', cls: 'du', short: 'Defeasibly unsafe' },
  { key: 'defeasibly_safe',   cls: 'ds', short: 'Defeasibly safe' },
  { key: 'robustly_safe',     cls: 'rs', short: 'Robustly safe' },
]

export const MAX_LIVE_INSTANCES = 5