# Copy review loop

Comment on the docs site in your browser → comments become todos → `/loop`
applies the edits → watch statuses go green live.

## Start a review session

```bash
./review/start.sh
```

This runs the docs site (http://127.0.0.1:8000) and the review sidecar
(http://127.0.0.1:8001) together. Open the site and start reviewing.

> The site serves under a base path, so pages live at
> `http://127.0.0.1:8000/AyuSpec/…`.

## Leave comments

1. **Select any text** on a page. A **💬 Comment** button appears.
2. Click it, type what should change, hit **Add to todos**.
3. The comment is saved to `review/todos.json`, tagged with the source `.md`
   file, the nearest heading, and the exact text you highlighted.

The **📋 Review** button (bottom-right) lists this page's comments and their
status. Headings with comments get a colored pin: amber = open, green = done.

## Apply the fixes

In Claude Code, run the processor on a loop:

```
/loop 30s /apply-review-todos
```

Each pass picks up open todos, edits the referenced doc, and writes the status
(`open → in_progress → done`) plus a one-line resolution back to
`review/todos.json`. Because the sidecar re-reads that file every request, the
pins and dashboard update **live** while `/loop` works. When nothing is open,
the loop reports idle — stop it with `/loop stop` (or let a self-paced loop end
itself).

Prefer one-offs? Just run `/apply-review-todos` once.

## See what was fixed

- **Dashboard:** http://127.0.0.1:8001/ — every todo, grouped by status, each
  `done` item showing the **Fixed:** resolution note. Auto-refreshes.
- **On the page:** green ✓ pins next to headings; the Review panel shows the
  resolution inline.
- **In git:** the actual copy changes are ordinary edits to `docs/*.md`.

## Notes

- The overlay is **dev-only**: `docs/assets/review.js` no-ops unless served from
  localhost with the sidecar answering. It ships to GitHub Pages harmlessly.
- `review/todos.json` is gitignored (personal review state). Un-ignore it in
  `.gitignore` if you want to keep the audit trail in version control.
- No dependencies beyond what the site already uses — the sidecar is stdlib
  Python.
