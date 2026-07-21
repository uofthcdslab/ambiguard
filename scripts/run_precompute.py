"""Offline precompute for the Ambiguity in Guardrails sandbox.

Also the pilot harness: point INPUT_CSV at 10-15 instances, run it, and read
the JSON before trusting anything downstream.

Per instance (design document, section 4.1):
    1. G(original)                  -> PREDICTION
    2. Prompt 1 -> supporting assumption + injection
    3. G(original + support)        -> consistency arm; should NOT move
    4. Prompt 2 -> flipping assumption + injection, or not possible
    5. G(original + flip)           -> disposition arm; expected to move
       (not possible => robustly-PREDICTION)

Writes one JSON per instance into ../public/precomputed/ plus index.json,
which is exactly what the site reads. Commit both.

    export OPENROUTER_API_KEY=sk-or-...
    python scripts/run_precompute.py
"""

import asyncio
import hashlib
import json
import os
import time
from datetime import datetime

import pandas as pd
from openai import AsyncOpenAI, RateLimitError
from tenacity import (
    retry, wait_exponential, stop_after_attempt, retry_if_exception_type,
)
from tqdm.asyncio import tqdm

from prompts import PROMPT_SUPPORT, PROMPT_FLIP, fill

# --------------------------------------------------------------------------
# config  -- these three strings are part of the cache key. If you change any
# of them, the site will miss every existing record until you re-run.
# Keep them identical to src/config.js.
# --------------------------------------------------------------------------

GUARD_ID = "meta-llama/llama-guard-4-12b"
REASONER_ID = "anthropic/claude-sonnet-4.6"
PROMPT_VERSION = "v1"

# Pin the provider once you know which one serves this guard with logprobs.
# Leave as None to let OpenRouter route freely.
GUARD_PROVIDER = None          # e.g. {"order": ["Groq"], "allow_fallbacks": False}
WANT_LOGPROBS = False          # flip to True once a provider is pinned

HERE = os.path.dirname(os.path.abspath(__file__))
INPUT_CSV = os.path.join(HERE, "..", "public", "data", "sample.csv")
OUT_DIR = os.path.join(HERE, "..", "public", "precomputed")
CONCURRENCY = 4

client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)

# --------------------------------------------------------------------------


def cache_key(text: str, guard_id: str) -> str:
    """Must match cacheKey() in src/lib/cache.js byte for byte."""
    normalised = " ".join(text.strip().split())
    raw = "|".join([normalised, guard_id, REASONER_ID, PROMPT_VERSION])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


@retry(
    retry=retry_if_exception_type(RateLimitError),
    wait=wait_exponential(multiplier=2, min=4, max=60),
    stop=stop_after_attempt(5),
)
async def _call(model_id: str, messages: list, **kwargs):
    return await client.chat.completions.create(model=model_id, messages=messages, **kwargs)


def _p_unsafe(response):
    """First-token probability of 'unsafe', or None when logprobs are absent."""
    lp = getattr(response.choices[0], "logprobs", None)
    content = getattr(lp, "content", None) if lp else None
    if not content:
        return None
    for pos in content:
        if pos.token.strip().lower() not in ("safe", "unsafe"):
            continue
        p = {}
        for alt in pos.top_logprobs:
            tok = alt.token.strip().lower()
            if tok in ("safe", "unsafe"):
                p[tok] = p.get(tok, 0.0) + 2.718281828459045 ** alt.logprob
        if "safe" in p and "unsafe" in p:
            return round(p["unsafe"] / (p["safe"] + p["unsafe"]), 6)
        if "unsafe" in p:
            return round(min(p["unsafe"], 1.0), 6)
        if "safe" in p:
            return round(max(1.0 - p["safe"], 0.0), 6)
        break
    return None


async def run_guard(text: str) -> dict:
    kwargs = dict(max_tokens=16, temperature=0)
    if GUARD_PROVIDER:
        kwargs["extra_body"] = {"provider": GUARD_PROVIDER}
    if WANT_LOGPROBS:
        kwargs["logprobs"] = True
        kwargs["top_logprobs"] = 20
    r = await _call(GUARD_ID, [{"role": "user", "content": text}], **kwargs)
    out = (r.choices[0].message.content or "").strip().lower()
    return {
        "verdict": "unsafe" if out.startswith("unsafe") else "safe",
        "p_unsafe": _p_unsafe(r) if WANT_LOGPROBS else None,
    }


async def run_reasoner(prompt: str) -> dict:
    r = await _call(
        REASONER_ID,
        [{"role": "user", "content": prompt}],
        max_tokens=800,
        temperature=0,
        response_format={"type": "json_object"},
    )
    return json.loads(r.choices[0].message.content)


async def process(semaphore: asyncio.Semaphore, row: dict) -> dict:
    text = str(row["instance"]).strip()
    async with semaphore:
        t0 = time.monotonic()
        base = {
            "key": cache_key(text, GUARD_ID),
            "instance": text,
            "safety_type": row.get("safety_type"),
            "ground_truth": row.get("ground_truth") or None,
            "guard": GUARD_ID,
            "reasoner": REASONER_ID,
            "prompt_version": PROMPT_VERSION,
            "fixture": False,
        }
        try:
            original = await run_guard(text)
            prediction = original["verdict"]

            support = await run_reasoner(fill(PROMPT_SUPPORT, text, prediction))
            support_run = (
                await run_guard(support["injection"]) if support.get("injection") else None
            )

            flip = await run_reasoner(fill(PROMPT_FLIP, text, prediction))
            flip_run = (
                await run_guard(flip["injection"]) if flip.get("injection") else None
            )

            level = (
                f"defeasibly_{prediction}" if flip.get("assumption")
                else f"robustly_{prediction}"
            )


            return {
                **base,
                "original": original,
                "support": {
                    "assumption": support.get("assumption"),
                    "injection": support.get("injection"),
                    "role": support.get("role"),
                    "run": support_run,
                    "inconsistent": (
                        None if support_run is None
                        else support_run["verdict"] != prediction
                    ),
                },
                "flip": {
                    "assumption": flip.get("assumption"),
                    "injection": flip.get("injection"),
                    "role": flip.get("role"),
                    "run": flip_run,
                    "moved": (
                        None if flip_run is None else flip_run["verdict"] != prediction
                    ),
                },
                "level": level,
                "latency_ms": round((time.monotonic() - t0) * 1000),
                "error": None,
            }
        except Exception as e:
            return {**base, "original": None, "support": None, "flip": None,
                    "level": None, "latency_ms": round((time.monotonic() - t0) * 1000),
                    "error": str(e)}


async def main():
    df = pd.read_csv(INPUT_CSV).fillna("")
    rows = df.to_dict(orient="records")
    os.makedirs(OUT_DIR, exist_ok=True)

    semaphore = asyncio.Semaphore(CONCURRENCY)
    start = time.monotonic()

    index, n_ok, n_fail, n_nolp = {}, 0, 0, 0
    levels, moved, inconsistent, roles = {}, 0, 0, {}

    futures = [asyncio.create_task(process(semaphore, r)) for r in rows]

    with tqdm(total=len(futures), desc="Precomputing") as pbar:
        for future in asyncio.as_completed(futures):
            rec = await future
            if rec["error"]:
                n_fail += 1
                pbar.write(f"  ! {rec['instance'][:48]!r}: {rec['error'][:90]}")
            else:
                n_ok += 1
                if rec["original"]["p_unsafe"] is None:
                    n_nolp += 1
                levels[rec["level"]] = levels.get(rec["level"], 0) + 1
                if rec["flip"]["moved"]:
                    moved += 1
                if rec["support"]["inconsistent"]:
                    inconsistent += 1
                r = rec["flip"]["role"]
                if r:
                    roles[r] = roles.get(r, 0) + 1

                with open(os.path.join(OUT_DIR, f"{rec['key']}.json"), "w") as f:
                    json.dump(rec, f, indent=2)
                index[rec["key"]] = {
                    "instance": rec["instance"][:120],
                    "safety_type": rec["safety_type"],
                    "guard": rec["guard"],
                    "reasoner": rec["reasoner"],
                    "prompt_version": rec["prompt_version"],
                    "fixture": False,
                }
            pbar.update(1)

    with open(os.path.join(OUT_DIR, "index.json"), "w") as f:
        json.dump(index, f, indent=2)

    total = sum(levels.values()) or 1
    defeasible = sum(n for k, n in levels.items() if k.startswith("defeasibly"))

    print(f"\n{'='*56}")
    print(f" PRECOMPUTE COMPLETE   {datetime.now():%Y-%m-%d %H:%M}")
    print(f"{'='*56}")
    print(f" ok / failed        : {n_ok} / {n_fail}")
    print(f" wall time          : {round((time.monotonic()-start)/60, 2)} min")
    print(f" no logprobs        : {n_nolp}  (must be 0 for a live threshold slider)")
    print("\n level split  <- if 'robustly_*' never fires, the plausibility bar is too low")
    for k in sorted(levels):
        print(f"   {k:22s} {levels[k]:4d}  ({100*levels[k]/total:.0f}%)")
    print(f"\n defeater roles     : {roles or 'none'}")
    print(f" guard moved on flip: {moved} / {defeasible} defeasible instances")
    print(f" inconsistent       : {inconsistent}  <- guard also moved on the SUPPORT")
    print("                       injection; that movement is added-text noise, not content")
    print(f"{'='*56}")


if __name__ == "__main__":
    asyncio.run(main())
