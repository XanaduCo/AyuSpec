---
name: apply-review-todos
description: Apply pending copy-review comments from review/todos.json to the docs, updating each item's status live. Designed to be run repeatedly via /loop.
---

# Apply review todos

You are processing copy-review comments a human left on the ayuOS docs site.
The queue is `review/todos.json`. Each item looks like:

```json
{
  "id": "t-0001",
  "page": "vision.md",          // source file, relative to docs/
  "url": "/vision/",
  "section": "Core User Problem", // nearest heading text
  "anchor": "core-user-problem",  // heading id
  "quote": "the exact text they highlighted",
  "comment": "what they want changed",
  "status": "open",              // open | in_progress | done | wontfix
  "resolution": null
}
```

The local review sidecar (`review/server.py`) reads this same file on every
request, and the browser overlay + dashboard poll every 3s. So **every time you
write the file, the human sees it update live.** Write status transitions as you
go — do not batch them to the end.

## Each run

1. **Read `review/todos.json`.** Consider only items with `status == "open"`.
   - If there are none, STOP. Report "No open review todos." If this is a
     self-paced `/loop`, end the loop (do not schedule another wake-up).

2. **Process open items one at a time** (up to 3 per run, then let the loop
   fire again — this keeps status visibly streaming):

   a. Set that item's `status` to `"in_progress"` and write the file
      immediately (edit the JSON directly with the Edit tool; keep it valid).

   b. Open `docs/<page>`. Locate the section using `anchor`/`section`, and the
      exact `quote` within it. Apply the change the `comment` asks for. Match
      the surrounding voice, heading style, and markdown conventions of the file.
      - If the quote no longer exists (the copy already moved on) or the request
        is ambiguous/out of scope, set `status` to `"wontfix"` and put the reason
        in `resolution` instead of guessing.

   c. Set `status` to `"done"` and write a **one-sentence** `resolution`
      describing what you actually changed (e.g. "Tightened the opening
      sentence and dropped the redundant clause."). Write the file.

3. After the run, briefly report which ids you closed and how, most recent first.

## Rules

- Edit **only** the docs files named by the todos. Do not touch unrelated copy.
- One item = one focused edit. Don't rewrite whole sections unless the comment
  asks for it.
- Never delete an item from the queue — status + resolution ARE the audit trail
  of what was fixed. `done` and `wontfix` items stay in the file.
- Keep `review/todos.json` valid JSON at every write (the sidecar and overlay
  read it constantly). Preserve every field; only change `status`, `resolution`,
  and `updated`.
- These docs are a public spec — keep claims accurate to CLAUDE.md and the ADRs;
  don't introduce facts the comment didn't ask for.
