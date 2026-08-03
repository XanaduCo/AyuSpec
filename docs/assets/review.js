/* ayuOS review overlay.
 *
 * Lets you select text on the MkDocs site and attach a comment. Comments are
 * POSTed to the local review sidecar (review/server.py), which appends them to
 * review/todos.json — the same file `/loop` reads to apply fixes.
 *
 * DEV-ONLY BY DESIGN: this whole script no-ops unless the page is served from
 * localhost AND the sidecar answers /api/health. On the deployed GitHub Pages
 * site the health check fails and nothing renders, so shipping this asset is
 * harmless.
 */
(function () {
  "use strict";

  var host = location.hostname;
  var isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  if (!isLocal) return;

  var API = "http://127.0.0.1:8001";
  var meta = window.AYU_REVIEW || {};
  var SRC = meta.src || "";          // e.g. "vision.md" (from the theme override)
  var PAGE_URL = location.pathname;  // for deep-links back from the dashboard

  // ---- helpers ------------------------------------------------------------
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return (s || "").replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }
  function api(path, opts) {
    return fetch(API + path, opts).then(function (r) {
      if (!r.ok) throw new Error("bad status " + r.status);
      return r.status === 204 ? null : r.json();
    });
  }

  // Nearest heading at or above a node, within the article body.
  function headingFor(node) {
    var article = document.querySelector(".md-content article") || document.querySelector("article");
    if (!article) return null;
    if (node && node.nodeType === 3) node = node.parentElement;
    // Collect headings in document order, pick the last one that precedes node.
    var heads = Array.prototype.slice.call(article.querySelectorAll("h1,h2,h3,h4,h5,h6"));
    var chosen = null;
    for (var i = 0; i < heads.length; i++) {
      if (node && (heads[i].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        chosen = heads[i];
      }
    }
    if (!chosen && heads.length) chosen = heads[0];
    if (!chosen) return null;
    var text = chosen.textContent.replace(/¶/g, "").trim();
    return { id: chosen.id || "", text: text, node: chosen };
  }

  // ---- floating "Comment" button on selection -----------------------------
  var floatBtn = null;
  function clearFloat() {
    if (floatBtn) { floatBtn.remove(); floatBtn = null; }
  }

  document.addEventListener("mouseup", function (e) {
    // Ignore selections/clicks inside our own UI.
    if (e.target.closest && e.target.closest(".ayu-pop,.ayu-panel,.ayu-fab,.ayu-cbtn,.ayu-pin")) return;
    setTimeout(function () {
      var sel = window.getSelection();
      var text = sel && sel.toString().trim();
      clearFloat();
      if (!text || text.length < 2) return;
      var article = document.querySelector(".md-content article") || document.querySelector("article");
      if (!article || !sel.anchorNode || !article.contains(sel.anchorNode)) return;
      var rect = sel.getRangeAt(0).getBoundingClientRect();
      floatBtn = el("button", "ayu-cbtn", "💬 Comment");
      floatBtn.style.left = window.scrollX + rect.left + rect.width / 2 + "px";
      floatBtn.style.top = window.scrollY + rect.top + "px";
      floatBtn.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
      floatBtn.addEventListener("click", function () {
        var head = headingFor(sel.anchorNode);
        openComposer(text, head, rect);
        clearFloat();
      });
      document.body.appendChild(floatBtn);
    }, 10);
  });

  document.addEventListener("scroll", clearFloat, { passive: true });

  // ---- composer popover ---------------------------------------------------
  function openComposer(quote, head, rect) {
    closeComposer();
    var pop = el("div", "ayu-pop");
    pop.id = "ayu-pop";
    var where = head ? esc(SRC) + " › " + esc(head.text) : esc(SRC);
    pop.appendChild(el("div", "ayu-where", where));
    if (quote) pop.appendChild(el("div", "ayu-quote", esc(quote)));
    var ta = el("textarea");
    ta.placeholder = "What should change here?";
    pop.appendChild(ta);
    var actions = el("div", "ayu-actions");
    var cancel = el("button", "ayu-cancel", "Cancel");
    var save = el("button", "ayu-save", "Add to todos");
    save.disabled = true;
    ta.addEventListener("input", function () { save.disabled = !ta.value.trim(); });
    cancel.addEventListener("click", closeComposer);
    save.addEventListener("click", function () {
      save.disabled = true;
      save.textContent = "Saving…";
      api("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: SRC,
          url: PAGE_URL,
          section: head ? head.text : "",
          anchor: head ? head.id : "",
          quote: quote,
          comment: ta.value.trim(),
        }),
      }).then(function () {
        closeComposer();
        refresh();
      }).catch(function () {
        save.textContent = "Failed — retry";
        save.disabled = false;
      });
    });
    actions.appendChild(cancel);
    actions.appendChild(save);
    pop.appendChild(actions);

    pop.style.left = Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - 340) + "px";
    pop.style.top = window.scrollY + rect.bottom + 8 + "px";
    document.body.appendChild(pop);
    ta.focus();
  }
  function closeComposer() {
    var p = document.getElementById("ayu-pop");
    if (p) p.remove();
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeComposer(); clearFloat(); } });

  // ---- rendering existing todos ------------------------------------------
  var STATE_LABEL = { open: "open", in_progress: "wip", done: "done", wontfix: "skip", closed: "closed" };

  function setStatus(id, status) {
    api("/api/comments/" + id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status }),
    }).then(refresh).catch(function () {});
  }

  function renderPins(items) {
    // Remove old pins.
    document.querySelectorAll(".ayu-pin").forEach(function (p) { p.remove(); });
    var byAnchor = {};
    items.forEach(function (it) {
      var key = it.anchor || "__page__";
      (byAnchor[key] = byAnchor[key] || []).push(it);
    });
    Object.keys(byAnchor).forEach(function (anchor) {
      var group = byAnchor[anchor];
      var head = anchor === "__page__" ? null : document.getElementById(anchor);
      if (!head) {
        // Fall back: attach page-level pins to the first article heading.
        head = document.querySelector(".md-content article h1, article h1");
      }
      if (!head) return;
      var states = group.map(function (g) { return g.status; });
      var allDone = states.every(function (s) { return s === "done" || s === "wontfix" || s === "closed"; });
      var anyOpen = states.some(function (s) { return s === "open"; });
      var anyWip = states.some(function (s) { return s === "in_progress"; });
      var state = allDone ? "done" : anyWip && !anyOpen ? "in_progress" : anyOpen && states.length > 1 && !allDone ? "mixed" : "open";
      if (anyOpen && (anyWip || states.some(function (s) { return s === "done"; }))) state = "mixed";
      var pin = el("span", "ayu-pin", (allDone ? "✓ " : "") + group.length);
      pin.setAttribute("data-state", allDone ? "done" : anyOpen ? (states.length > 1 ? "mixed" : "open") : "in_progress");
      pin.title = group.map(function (g) { return "[" + g.status + "] " + g.comment; }).join("\n");
      pin.addEventListener("click", function () { openPanel(); });
      head.appendChild(pin);
    });
  }

  // ---- floating panel -----------------------------------------------------
  var fab, panel;
  function ensurePanel() {
    if (fab) return;
    fab = el("button", "ayu-fab", "📋 Review");
    fab.addEventListener("click", function () { panel.classList.toggle("open"); });
    panel = el("div", "ayu-panel");
    panel.addEventListener("click", function (e) {
      var c = e.target.closest("[data-close]");
      var r = e.target.closest("[data-reopen]");
      if (c) setStatus(c.getAttribute("data-close"), "closed");
      else if (r) setStatus(r.getAttribute("data-reopen"), "open");
    });
    document.body.appendChild(panel);
    document.body.appendChild(fab);
  }
  function openPanel() { ensurePanel(); panel.classList.add("open"); }

  function renderPanel(items) {
    ensurePanel();
    var open = items.filter(function (i) { return i.status === "open" || i.status === "in_progress"; }).length;
    fab.innerHTML = "📋 Review" + (open ? " <b>(" + open + ")</b>" : items.length ? " ✓" : "");
    var rank = { open: 0, in_progress: 0, done: 1, wontfix: 1, closed: 1 };
    var sorted = items.slice().sort(function (a, b) {
      return (rank[a.status] - rank[b.status]) || b.id.localeCompare(a.id);
    });
    var rows = sorted.length
      ? sorted.map(function (i) {
          var btn = i.status === "closed"
            ? '<button class="ayu-x" data-reopen="' + i.id + '" title="Reopen">↺</button>'
            : '<button class="ayu-x" data-close="' + i.id + '" title="Close">✕</button>';
          return '<div class="ayu-row">' +
            btn +
            '<span class="ayu-badge" data-state="' + i.status + '">' + STATE_LABEL[i.status] + "</span>" +
            esc(i.comment) +
            (i.section ? '<div class="ayu-sec">› ' + esc(i.section) + "</div>" : "") +
            (i.resolution ? '<div class="ayu-res"><b>' + (i.status === "done" ? "Fixed:" : "Note:") + "</b> " + esc(i.resolution) + "</div>" : "") +
            "</div>";
        }).join("")
      : '<div class="ayu-off">No comments on this page yet. Select text to add one.</div>';
    panel.innerHTML = "<h4>This page</h4>" + rows +
      '<a class="ayu-dash" href="' + API + '/" target="_blank">Open full dashboard ↗</a>';
  }

  // ---- poll ---------------------------------------------------------------
  function refresh() {
    if (!SRC) return;
    api("/api/comments?page=" + encodeURIComponent(SRC)).then(function (items) {
      items = items || [];
      renderPins(items);
      renderPanel(items);
    }).catch(function () { /* sidecar down: stay silent */ });
  }

  // Only wake up if the sidecar is actually running.
  api("/api/health").then(function () {
    ensurePanel();
    refresh();
    setInterval(refresh, 3000);
  }).catch(function () {
    // No sidecar → do nothing. (This is the deployed-site path too.)
  });
})();
