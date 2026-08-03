#!/usr/bin/env python3
"""ayuOS review sidecar.

A tiny, dependency-free HTTP server that owns the review todo store
(review/todos.json). The MkDocs review overlay (docs/assets/review.js) posts
comments here; `/loop` and the dashboard read/write the same file.

Deliberately stateless: every request reads and writes todos.json fresh, so
edits made directly to the file by `/loop` (via Claude's Edit tool) are picked
up immediately with no restart. Local-only tool — binds to 127.0.0.1.

    python3 review/server.py [--port 8001]

Routes
    GET  /                       -> dashboard (HTML)
    GET  /api/health             -> {"ok": true}
    GET  /api/comments           -> all todos (optional ?page=<src_path>)
    POST /api/comments           -> create a todo, returns it
    POST /api/comments/<id>      -> patch status/resolution/comment
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent
STORE = ROOT / "todos.json"

STATUSES = ("open", "in_progress", "done", "wontfix", "closed")


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load() -> list[dict]:
    if not STORE.exists():
        return []
    try:
        return json.loads(STORE.read_text() or "[]")
    except json.JSONDecodeError:
        return []


def save(items: list[dict]) -> None:
    tmp = STORE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(items, indent=2) + "\n")
    tmp.replace(STORE)


def next_id(items: list[dict]) -> str:
    n = 0
    for it in items:
        m = re.match(r"t-(\d+)", it.get("id", ""))
        if m:
            n = max(n, int(m.group(1)))
    return f"t-{n + 1:04d}"


class Handler(BaseHTTPRequestHandler):
    # Quieter logs.
    def log_message(self, fmt, *args):  # noqa: N802
        pass

    def _send(self, code: int, body: bytes, ctype: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        # The MkDocs dev server is a different origin (:8000); allow it.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def _json(self, code: int, obj) -> None:
        self._send(code, json.dumps(obj).encode(), "application/json")

    def _read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0) or 0)
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            return {}

    def do_OPTIONS(self):  # noqa: N802
        self._send(204, b"", "text/plain")

    def do_GET(self):  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/api/health":
            return self._json(200, {"ok": True})
        if path == "/api/comments":
            items = load()
            qs = parse_qs(parsed.query)
            page = qs.get("page", [None])[0]
            if page:
                items = [i for i in items if i.get("page") == page]
            return self._json(200, items)
        if path in ("/", "/dashboard"):
            return self._send(200, dashboard_html().encode(), "text/html; charset=utf-8")
        return self._json(404, {"error": "not found"})

    def do_POST(self):  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        body = self._read_body()

        if path == "/api/comments":
            items = load()
            item = {
                "id": next_id(items),
                "created": _now(),
                "updated": _now(),
                "page": (body.get("page") or "").strip(),
                "url": (body.get("url") or "").strip(),
                "section": (body.get("section") or "").strip(),
                "anchor": (body.get("anchor") or "").strip(),
                "quote": (body.get("quote") or "").strip(),
                "comment": (body.get("comment") or "").strip(),
                "status": "open",
                "resolution": None,
            }
            if not item["comment"]:
                return self._json(400, {"error": "comment is required"})
            items.append(item)
            save(items)
            return self._json(201, item)

        m = re.match(r"/api/comments/(t-\d+)$", path)
        if m:
            tid = m.group(1)
            items = load()
            for it in items:
                if it["id"] == tid:
                    if "status" in body and body["status"] in STATUSES:
                        it["status"] = body["status"]
                    if "resolution" in body:
                        it["resolution"] = body["resolution"]
                    if "comment" in body:
                        it["comment"] = body["comment"]
                    it["updated"] = _now()
                    save(items)
                    return self._json(200, it)
            return self._json(404, {"error": "no such id"})

        return self._json(404, {"error": "not found"})


def dashboard_html() -> str:
    return """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ayuOS review todos</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 15px/1.5 -apple-system, system-ui, sans-serif; margin: 0; padding: 24px;
         background: Canvas; color: CanvasText; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { opacity: .65; margin: 0 0 20px; font-size: 13px; }
  .counts { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
  .pill { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600;
          border: 1px solid color-mix(in srgb, CanvasText 20%, transparent); }
  .pill.open { background: #f59e0b22; color: #b45309; }
  .pill.in_progress { background: #3b82f622; color: #1d4ed8; }
  .pill.done { background: #22c55e22; color: #15803d; }
  .pill.wontfix { background: #6b728022; color: #4b5563; }
  .pill.closed { background: #6b728022; color: #4b5563; }
  .item { border: 1px solid color-mix(in srgb, CanvasText 15%, transparent); border-radius: 10px;
          padding: 12px 14px; margin-bottom: 10px; }
  .item.done, .item.wontfix, .item.closed { opacity: .72; }
  .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .actions { margin-left: auto; }
  .actions button { font: 600 11px/1 inherit; padding: 4px 10px; border-radius: 6px; cursor: pointer;
                    border: 1px solid color-mix(in srgb, CanvasText 25%, transparent); background: transparent; color: inherit; }
  .actions button:hover { background: color-mix(in srgb, CanvasText 10%, transparent); }
  .badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: .04em; }
  .badge.open { background: #f59e0b22; color: #b45309; }
  .badge.in_progress { background: #3b82f622; color: #1d4ed8; }
  .badge.done { background: #22c55e22; color: #15803d; }
  .badge.wontfix { background: #6b728022; color: #4b5563; }
  .badge.closed { background: #6b728022; color: #4b5563; }
  .where { font-size: 12px; opacity: .7; }
  .comment { margin: 8px 0 0; }
  .quote { border-left: 3px solid color-mix(in srgb, CanvasText 25%, transparent);
           padding-left: 10px; margin: 8px 0 0; font-size: 13px; opacity: .8; font-style: italic; }
  .resolution { margin: 8px 0 0; padding: 8px 10px; border-radius: 8px; font-size: 13px;
                background: #22c55e14; }
  .resolution b { color: #15803d; }
  a { color: inherit; }
  .empty { opacity: .6; padding: 40px 0; text-align: center; }
</style></head>
<body>
  <h1>ayuOS review todos</h1>
  <p class="sub">Live view of <code>review/todos.json</code>. Auto-refreshes every 3s.</p>
  <div class="counts" id="counts"></div>
  <div id="list"></div>
<script>
const esc = s => (s||"").replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function setStatus(id, status) {
  try {
    await fetch('/api/comments/' + id, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({status})
    });
  } catch (e) {}
  tick();
}
async function tick() {
  let items = [];
  try { items = await (await fetch('/api/comments')).json(); } catch (e) {}
  // Pending (open / in_progress) on top; newest first within each group.
  const order = { open:0, in_progress:0, done:1, wontfix:1, closed:1 };
  items.sort((a,b) => (order[a.status]-order[b.status]) || b.id.localeCompare(a.id));
  const counts = { open:0, in_progress:0, done:0, wontfix:0, closed:0 };
  items.forEach(i => counts[i.status] = (counts[i.status]||0)+1);
  document.getElementById('counts').innerHTML =
    Object.entries(counts).map(([k,v]) =>
      `<span class="pill ${k}">${k.replace('_',' ')}: ${v}</span>`).join('');
  const list = document.getElementById('list');
  if (!items.length) { list.innerHTML = '<div class="empty">No review comments yet. Select text on the site and add one.</div>'; return; }
  list.innerHTML = items.map(i => `
    <div class="item ${i.status}">
      <div class="row">
        <span class="badge ${i.status}">${i.status.replace('_',' ')}</span>
        <span class="mono">${i.id}</span>
        <span class="where">${esc(i.page)}${i.section ? ' &rsaquo; ' + esc(i.section) : ''}
          ${i.url && i.anchor ? `&middot; <a href="${i.url}#${i.anchor}" target="_blank">open&nearr;</a>` : ''}</span>
        <span class="actions">${i.status === 'closed'
          ? `<button onclick="setStatus('${i.id}','open')">Reopen</button>`
          : `<button onclick="setStatus('${i.id}','closed')">Close</button>`}</span>
      </div>
      <div class="comment">${esc(i.comment)}</div>
      ${i.quote ? `<div class="quote">${esc(i.quote)}</div>` : ''}
      ${i.resolution ? `<div class="resolution"><b>${i.status === 'done' ? 'Fixed:' : 'Note:'}</b> ${esc(i.resolution)}</div>` : ''}
    </div>`).join('');
}
tick(); setInterval(tick, 3000);
</script>
</body></html>"""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8001)
    args = ap.parse_args()
    if not STORE.exists():
        save([])
    httpd = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"ayuOS review sidecar → http://127.0.0.1:{args.port}  (dashboard at /)")
    print(f"store: {STORE}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    main()
