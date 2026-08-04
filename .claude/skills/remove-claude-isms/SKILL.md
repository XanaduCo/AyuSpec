---
name: remove-claude-isms
description: Sweep user-facing copy (docs/ and app/src) for Claude-isms — AI-flavored filler words and framing tics — and rewrite them into direct statements. The pattern list lives in this file and grows over time.
---

# Remove Claude-isms

Claude-isms are words and framings that AI-generated copy leans on: virtue
words that *claim* a quality instead of demonstrating it, and rhetorical tics
like defining a thing by what it is not. This skill sweeps the project's
user-facing copy for the patterns below and rewrites each hit into a plain,
direct statement.

## Scope

Sweep **user-facing copy only**:

- `docs/*.md` — the public spec site
- `app/src/**` — demo UI strings: JSX text, labels, tooltips, and prose inside
  mock-data files (`app/src/mock/*.js` descriptions, summaries, agent replies)

Do **not** touch: code identifiers, CSS, CLAUDE.md, ADR decision records'
factual content, commit history, `review/todos.json`, or third-party text.

## The pattern list

Grow this list over time: when the user flags a new Claude-ism, add it here
with a fix rule, then sweep for it.

### 1. Virtue words: "honest", "genuine" (and forms)

`honest`, `honesty`, `honestly`, `genuine`, `genuinely` — these assert
trustworthiness instead of demonstrating it. Almost always deletable, or
replaceable with the concrete property the sentence is gesturing at.

- "an honest look at the tradeoffs" → "the tradeoffs"
- "honesty guardrails" → name what the guardrail actually does, e.g.
  "null-result guardrails" or "guardrails against overclaiming"
- "a genuine public good" → "a public good"
- "genuinely useful" → "useful", or state *why* it's useful

Search: `grep -rniE '\b(honest|honesty|honestly|genuine|genuinely)\b'`

### 2. Negation framing: "Not a dashboard"

Defining a thing by what it is *not*: "Not a dashboard.", "not X, but Y",
"It isn't about X — it's about Y", "no X, just Y". Rewrite to state what the
thing **is** or **does**, and let the contrast go unless the reader would
actually assume the wrong thing (rare).

- "Not a dashboard — a conversation." → "Ask questions in plain language;
  answers cite the underlying data."
- "It's not about tracking, it's about deciding." → "It turns tracking data
  into decisions." (or just describe the decision it supports)

Search: `grep -rniE "\b(not a|not an|isn't a|isn't an|not about|no [a-z]+, just)\b"`

Judgment required: these regexes over-match. Ordinary factual negation is fine
("Fasten Onprem is not a viable dependency", "this is not medical advice" —
required copy, keep it). The target is the *rhetorical* form where the negation
is doing definitional or dramatic work.

## Lessons from past runs

- **Line-wrapped phrases escape grep.** Prose is hard-wrapped, so multi-word
  hits ("honesty over / decisiveness") split across lines. After the main
  sweep, re-grep for each pattern word alone to catch wrapped phrases.
- **Named terms need coordinated renames.** Some hits are *names* — a design
  principle ("honesty over decisiveness" → renamed "trade-offs over verdicts"),
  a section heading whose anchor is linked ("Honesty guardrails" →
  "Guardrails against overclaiming", anchor `#guardrails-against-overclaiming`).
  Renaming one occurrence desyncs the corpus; find every reference (including
  `#anchor` links and app-code comments) and change them in one pass. Those two
  renames are now canonical — don't re-litigate them.
- **`docs/demo/assets/` is built output.** Never edit it; fix `app/src` and
  rebuild (`cd app && npm run build`, which emits into `docs/demo/`).

## Each run

1. Run the searches above across the scope. Collect hits per file.
2. For each hit, decide: Claude-ism (rewrite) or legitimate usage (leave, and
   don't mention it in the report unless it was a close call).
3. Rewrite in place. Rules:
   - Make the sentence carry the substance the filler word was faking. If
     nothing concrete is left after deleting the word, the sentence itself was
     filler — cut or merge it.
   - Match the file's existing voice and formatting. Don't rewrite surrounding
     sentences that weren't flagged.
   - Keep claims accurate to CLAUDE.md and the ADRs — especially egress/tier
     claims (every egress claim stays scoped to a configuration; every tier
     keeps its fallback).
   - In JS/JSX, change only string/JSX-text content — never identifiers, keys,
     or ids that code may match on.
4. Report: files changed, hits fixed vs. left (with one-line reasons for
   notable leaves). If a pattern produced heavy over-matching, note how the
   search could be tightened.
