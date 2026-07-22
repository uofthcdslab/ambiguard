"""Regenerate src/lib/prompts.js from scripts/prompts.py.

scripts/prompts.py has the prompt text that will be used to call the reasoning models. Edit that if needed,
then run:

    python scripts/sync_prompts.py

and bump PROMPT_VERSION in scripts/run_precompute.py and src/config.js.
"""

import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
PY_PATH = os.path.join(HERE, "prompts.py")
JS_PATH = os.path.join(HERE, "..", "src", "lib", "prompts.js")

TEMPLATE = '''// Prompts to A. Mirrored from scripts/prompts.py -- regenerate with
// `python scripts/sync_prompts.py` rather than editing this file by hand.
//
// These are SYSTEM prompts. The instance, the prediction, and (for Prompt 2)
// the assumption from Prompt 1 go in the user message, built below.

export const PROMPT_1_SYSTEM = `{p1}`

export const PROMPT_2_SYSTEM = `{p2}`

export function user1(text, prediction) {{
  return `Input: ${{text}}\\nPrediction: ${{prediction}}`
}}

export function user2(text, prediction, assumption) {{
  return (
    `Input: ${{text}}\\n` +
    `Prediction: ${{prediction}}\\n` +
    `Assumption the prediction rests on: ${{assumption}}`
  )
}}
'''


def grab(src, name):
    m = re.search(r'%s = """(.*?)"""' % name, src, re.S)
    if not m:
        raise SystemExit(f"Could not find {name} in prompts.py")
    return m.group(1)


def main():
    src = open(PY_PATH, encoding="utf-8").read()
    p1, p2 = grab(src, "PROMPT_1_SYSTEM"), grab(src, "PROMPT_2_SYSTEM")
    for p in (p1, p2):
        if "`" in p or "${" in p:
            raise SystemExit(
                "Prompt text contains a backtick or ${, which would break the "
                "JavaScript template literal. Reword it."
            )
    with open(JS_PATH, "w", encoding="utf-8") as f:
        f.write(TEMPLATE.format(p1=p1, p2=p2))
    print("Wrote src/lib/prompts.js from scripts/prompts.py")
    print("Now bump PROMPT_VERSION in scripts/run_precompute.py and src/config.js")


if __name__ == "__main__":
    main()
