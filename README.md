# Ambiguity in Guardrails

A sandbox for reflective guardrail evaluation. Two views over the same eval set and
the same guard: **Standard** (thresholds and aggregate metrics) and **Ambiguity**
(the same instances split by whether the label survives a plausible rereading).

Static site. No server, no database. Precomputed model output is committed to the
repo and loaded as JSON.

## What is where

```
public/data/sample.csv        the built-in eval set (3 columns)
public/precomputed/           one JSON per instance + index.json
scripts/run_precompute.py     offline pipeline; also the pilot harness
scripts/make_fixtures.py      writes PLACEHOLDER records so the UI renders
scripts/prompts.py            mirror of src/lib/prompts.js
src/config.js                 models, prompt version, level definitions
src/lib/cache.js              cache key + lookup (must match run_precompute.py)
src/lib/pipeline.js           live path for participant-entered instances
```

## The records currently in the repo are placeholders

`public/precomputed/` ships hand-written fixtures so the interface has something to
render before you have run anything. They are marked `"fixture": true` and the app
shows a warning banner whenever one is on screen. **Replace them before a session.**

## Run it locally

Requires Node 22.12 or newer (`node --version` to check).

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173/ambiguity-sandbox/).

## Deploy to GitHub Pages

1. Create a repo under the lab account. If you do not name it `ambiguity-sandbox`,
   change `base` in `vite.config.js` to `'/<your-repo-name>/'` — the site will load
   a blank page otherwise.
2. Push this directory to `main`.
3. Repo → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` runs on every push to `main`.
   Watch it under the Actions tab; the URL appears there when it finishes.

## Replace the placeholders with real output

```bash
pip install -r scripts/requirements.txt
export OPENROUTER_API_KEY=sk-or-...
rm public/precomputed/*.json
python scripts/run_precompute.py
git add public/precomputed && git commit -m "precompute: <guard>, prompts v1" && git push
```

The summary it prints is the pilot readout. Three things to look at:

- **level split** — if `robustly_*` never fires, Prompt 2's plausibility bar is too
  low and every instance will look contested.
- **inconsistent** — how often the guard also moved on the *supporting* injection.
  Movement on both arms is added-text sensitivity, not a response to content.
- **no logprobs** — must be 0 before the threshold slider can be made live.

## The four statistics in the Ambiguity view

Each line shows two numbers. Hover the "i" beside a name for the definition.

- **Defeasibility** — share of the guard's predictions for which a plausible
  opposing assumption exists, split by unsafe vs. safe predictions.
- **Correct but contestable** - of the instances where the prediction matched
  the gold label, the share tagged contestable; and the same for the instances
  where it did not match. Uses the level already on each record, so it costs no
  extra model calls. Hidden entirely when the selection has no ground truth.

- **Movement** — on contestable instances, how often the verdict actually flips,
  and the mean change in predicted probability (needs logprobs; shows a dash
  otherwise).
- **Consistency** — how often the verdict holds when the assumption it rests on
  is stated explicitly. It should hold; movement here suggests the guard is
  reacting to added text rather than content.

Both practitioner controls feed these numbers. Re-assigning a level changes which
instances count as contestable; unticking Acknowledged treats that row as settled
everywhere.

## Turning the threshold slider on

The slider is visible but disabled, because none of the configured guards is known
to return a score. To enable it:

1. Pick a guard and find a provider that returns logprobs for it.
2. In `scripts/run_precompute.py` set `GUARD_PROVIDER` to that provider and
   `WANT_LOGPROBS = True`.
3. Re-run the precompute. Confirm the summary reports `no logprobs: 0`.
4. In `src/config.js` set `logprobs: true` on that guard.

The slider then repartitions the table and recomputes the metrics entirely in the
browser — no API calls.

## Editing the prompts

`src/lib/prompts.js` and `scripts/prompts.py` must stay identical. After editing
either, bump `PROMPT_VERSION` in **both** `src/config.js` and
`scripts/run_precompute.py`, then re-run the precompute. The version is part of the
cache key; without the bump the site keeps serving reconstructions built from the
old prompt and nothing on screen says so.

## API keys

Participants only need a key for instances that are not precomputed (capped at 5 per
run). The key is held in React state, is never written to browser storage, and does
not survive a reload.

For sessions where you would rather participants never see a key at all, put a
Cloudflare Worker in front of OpenRouter, hold the key as a Worker secret, and point
`ENDPOINT` in `src/lib/pipeline.js` at the Worker. The rest of the app is unchanged.
