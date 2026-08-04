# Frontend & UI

## Principles

- **Local-first web app.** Self-hosted, it is served by a local process at `localhost` and needs no internet connection to use. The managed tier serves the same app over HTTPS; there is no separate cloud UI.
- **Telemetry is off by default.** No analytics, crash reporting, or usage metrics are collected unless you opt in — in any tier. When enabled, it covers app diagnostics only, never health data.
- **Fast to the first question.** The primary interaction is a chat input. The user should be able to ask a question within seconds of opening the app.
- **The current posture is always on screen.** The user never has to open settings to learn whether a cloud model is in the loop.

## Views

### Chat

The primary interface. A conversation-style chat with the agent.

- **Voice input** — ask by speaking, not just typing
- Markdown rendering for responses
- Inline evidence labels (tooltips on `[SOURCE-BACKED]`, `[INFERRED]`, etc.); tapping a label expands the relevant [epistemics concept](epistemics.md) with the current claim as the worked example
- Comparison frame: intervention-vs-intervention view on fixed axes (evidence, effect, cost, risk) per [Health Literacy & Epistemics](epistemics.md#the-comparison-frame)
- Source cards: clicking a citation opens the underlying FHIR resource or document
- **Provider status indicator** in the header — per-role, green for local and amber for cloud, reflecting what actually ran ([AI Transparency](ai-transparency.md#1-status-indicator))
- **Pre-send review** when a cloud call is about to leave the device: the exact payload, the redaction diff, the destination, and what was excluded outright
- Query history in the sidebar

### Now

The re-entry view. Every other view answers a question the user arrives with; Now answers the
question of arriving itself: *what, if anything, needs me?* It is deliberately **not a dashboard** —
no scores, no rings, no streaks, nothing that nags. Its body is a set of honest, system-computed
lists: decisions only the user can make, findings that appeared since they last looked, re-tests
actually due, what the record is openly missing, and what the current session changed. Every item
can be snoozed, snoozing leaves a trace rather than deleting, and no functionality is gated on
clearing the page.

One section is different in kind from all of those, and it renders first: pins.

#### Pinned: user-declared attention

There is an obvious tension here. Now is defined by *not* being a dashboard, and pinning puts
user-chosen, persistent items at the top of it. The resolution is that a pin is not a widget — it is
a **declaration of attention**. Everything else on Now is the *system* saying "this may need you,"
each item carrying its reason. A pin is the *user* saying "I am actively watching this" — usually a
running experiment or the two or three markers they are working on. Explicit, finite, editable.
The two kinds of attention sit on the same page precisely because they answer the same question
from opposite directions:

| | The system-computed lists | Pins |
|---|---|---|
| Who put it there | The system, with a stated reason | The user, explicitly |
| Lives until | Resolved or snoozed | Unpinned |
| Bounded by | What actually changed | A soft cap (~5–7) |
| Empty state | "Nothing needs you." — a good day | Empty is fine; pins are never suggested to fill space |

What keeps a pin from decaying into a dashboard tile is the card contract: **a pin card shows the
underlying signal and its trend against the relevant baseline — nothing derived on top.** No score,
no ring, no streak, no percent-of-goal. The number is the number, in monospace, with the reference
range as reported ([design-system law 8](design-system.md#interaction-laws)).

**What is pinnable, and what the card shows:**

| Object | Pinned from | The card shows |
|---|---|---|
| Running [experiment](experimentation.md) | Experiments | Day *N* of *M* · adherence (days logged / days elapsed) · primary metric mean vs. the pre-registered baseline window, with the pre-registered bar stated |
| Marker / metric | Explore, Timeline, a lab result — wherever you meet it | Latest value · sparkline-level trend · reference range as reported · comparison vs. the relevant baseline (prior draw for labs, the 90-day baseline for wearables) |
| Open [hypothesis](evidence.md) | Experiments | The statement · its evidence-strength label · what would move it (usually: "design the experiment") |
| A due item | The Due list on Now | The date and what the test costs. A pin here is a bookmark, not a reminder — it changes nothing about when or whether the item fires |

Pin affordances live **on the object where you meet it** — an experiment card in Experiments, a
marker in Explore or the Timeline — plus manage-in-place on Now itself (unpin, and a "pin
something" picker over the same candidates). There is no separate pin-management screen to
administer.

**The cap.** Pins are attention, and unbounded pins are a dashboard. The soft cap is **5–7**; the
reference implementation uses 6. At the cap, pinning one more asks the user to let one go first —
stated plainly, not gamified. The rule of the section: **this is a queue, not a wall.** If
everything is pinned, nothing is watched.

**Unpinning.** One click, no confirmation, no trace — unlike snoozing, unpinning is not an answer
the system needs to remember. When a pinned experiment completes, its card says so and suggests
letting it go: the verdict now lives in Experiments and in the record, and a pin is for something
still being watched. Suggests — the pin is the user's statement, so the system never removes it
on their behalf.

**What pins do not do:**

- **No notifications.** Pinning changes what renders on Now and nothing else. Anything worth
  interrupting for arrives through the attention lists, with its reason, whether pinned or not.
- **No engagement mechanics.** No streaks, no "7 days watched!", no celebration on improvement,
  no guilt on decline. The trend is shown; the editorializing is not.
- **They never reorder themselves.** Pin order is the order the user pinned in. A card that jumped
  to the top because its value moved would be the system reclaiming attention the user explicitly
  took for themselves.
- **They gate nothing.** Every answer, view, and export works identically with zero pins.

### Timeline

A chronological, navigable record of the user's health data.

- Zoomable time axis (day / week / month / year)
- Tracks: labs, wearable metrics, conditions, procedures, medications, imaging studies
- Click any event to see the underlying FHIR resource — this subsumes a raw resource browser; there is no separate admin-style resource view
- Overlay mode: select two metrics to see them on the same axis

### Doctor Packet

A structured export for sharing with a clinician: a curated brief.

**Sections:**
1. Summary: key metrics and notable changes over the selected period
2. Labs: trending values with reference ranges, flagged abnormals
3. Medications and conditions
4. Questions the user wants to raise

The packet is generated by the agent (R1 model). Its primary form is a **rich, shareable link** — a self-contained web view that keeps the trend charts, source cards, and evidence labels interactive — with a **PDF fallback** for printing or handing over on paper. Because ayuOS generates the content itself, the PDF is produced with a PDF library rather than a headless browser. The user reviews and edits before sharing.

### Ingestion management

A settings-style view for managing data sources:

- Status of each connector (last sync, record count, errors)
- Which tier each source is connected through, and whether its data transits a third party
- Trigger manual re-sync
- Upload files (Apple Health export, lab PDFs, genome file, DICOM)

### Call ledger

A browsable, filterable view of every model call — provider, destination, whether it left the device, the exact payload sent, and the response. Filterable by provider, role, date, and whether the gateway found anything to strip. See [AI Transparency](ai-transparency.md#3-call-ledger).

## Technology

**Decided: React + Vite.** The component complexity of the timeline and chat views is the deciding factor — both are stateful and richly interactive, and benefit directly from a component model and the surrounding ecosystem.

The alternatives considered:

| Option | Pros | Cons |
|---|---|---|
| **React + Vite** *(chosen)* | Ecosystem, component model | JS toolchain |
| Plain HTML/CSS/JS | Zero dependencies, fast | Manual DOM management |
| Svelte | Lightweight, good for local apps | Smaller ecosystem |
| HTMX | Server-side rendering, minimal JS | Less rich UI |

## Local serving

The frontend is served by the same local process that runs the agent API. A single `ayu start` command brings up Postgres, Ollama (if not already running), and the web server.

## Open questions

- [ ] Voice input transcription: on-device (preserving the local-first, zero-egress default) or an optional cloud STT the user opts into?
- [ ] Doctor-packet sharing: how is the rich shareable link delivered without breaking the local-first default — a time-boxed local URL, an explicit consented upload, or export-to-file? (The PDF fallback has no such concern.)
