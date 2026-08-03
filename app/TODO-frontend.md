# Front-end gaps — audit & todo

An audit of the demo app (`app/src/`) against the **front-end** user journeys in
`docs/journeys/` (03, 04, 06, 08, 09, 11, 12, 13, 14 — setup/install/infra flows 01, 02, 05, 07, 10
are deliberately out of scope for this pass).

The question asked of every journey step was narrow: **can a user actually do this in the UI today,
end to end?** Not "is it documented", not "is it pretty" — can they *do* it, and does doing it
*change anything*.

## The finding, in one sentence

The demo is very good at **explaining** and almost incapable of **doing**. Every view is a
beautifully-argued read-only poster. Eight of the eight views render state that no user action can
move: the upload dropzone prints `✓ parsed` and nothing anywhere else changes; the experiment is
permanently at 21/30 days; the connector never breaks so the fallback story is never *seen*; there
is nowhere to find out that something needs your attention; and there is no way to tell the system
it got something wrong. The app also over-indexes on privacy guardrails — the egress/consent
argument is made four separate times across Data sources, Share, Settings and Transparency, in
prose, while the actual health workflows have no verbs.

**The fix is mutable session state + consequences.** Everything below is ranked by how much user
value it unlocks, not effort.

---

## Ranked todo

### 1. Mutable session state (`src/state/store.js`) — the foundation ✅
*Enables everything below.* A React context + reducer holding a **session overlay** on top of the
read-only mocks. Views read `base mock + overlay`. `src/mock/**` is never mutated. Reset-on-reload
is honest and stated in the UI.
- [x] `state/store.js` — reducer, actions, selectors (`useLabs`, `useEvents`, `useWearables`,
      `useAttention`, `useConnector`, `useExperiment`, `useInventory`).
- [x] `state/fixtures.js` — the canned import payloads, capture options, screening rules, record
      gaps. Deterministic; no `Math.random()`.

### 2. Uploads with visible consequences — Journey 06, 03, 08 ✅
**User problem:** dropping a lab PDF / DICOM / genome / Apple Health export tells you `✓ parsed` and
then nothing in the app is different — the single loudest dead end in the product.
**UI:** the dropzone opens a **staged parse preview** (per-row value, unit, reference range,
hue-free confidence ramp, checkboxes) → **Add to record** → the overlay gains real records, and the
rest of the app visibly moves:
- [x] Timeline gains dated events + (for Apple Health) a whole new wearable lane, badged `new`.
- [x] The Now view gains findings ("Lp(a) 78 nmol/L — first ever measured, above threshold").
- [x] Data sources record counts increment; the import is listed with what was deduped.
- [x] Share's inventory gains the new resources, so the doctor packet actually changes.
- [x] A **low-confidence row blocks itself** — the urine-arsenic unit is ambiguous (µg/L vs
      µg/g creatinine, which are not interchangeable) and the user must resolve it before the row
      enters the record. The upload asks a question instead of guessing.
- [x] **Each import closes something the stored record actually left open**, rather than adding a
      marker Ravi already has nine draws of:
      - *lab PDF* → the speciated metals panel. Total arsenic was never speciated and blood mercury
        is over the limit; the import answers both (96% arsenobetaine; methylmercury is dietary) and
        resolves the seeded mercury item and the arsenic gap.
      - *genome* → a 2019 array against the stored 30× genome. **Zero new sites** (a chip is a subset
        of a sequence) and **one disagreement**, which is kept and marked rather than overwritten.
      - *Apple Health* → a second step lane beside the Garmin one. Both kept with their own
        provenance, neither averaged into a number no device measured.
      - *DICOM* → a knee MRI that is indexed but **not read** until you ask; the local vision model
        runs on request, pixels never leave.

### 3. "What needs my attention right now" — a Now view — Journey 14 §7, 12 §1, 08 §5 ✅
**User problem:** there is no re-entry point. Come back after a month and the app has no idea you
were away and nothing to tell you.
**UI:** a new first rail destination (`/now`) with a live count badge. Ask stays the landing route —
Law 5 is untouched. Sections: *since you were last here*, *needs a decision*, *screenings & re-tests
due*, *what the record is missing*. Every item carries one concrete action and a snooze; snoozing
leaves a visible trace rather than deleting the item.
- [x] Seeded from things genuinely sitting in the record: mercury over its limit and doubling,
      ferritin rising at every draw against an HFE compound-heterozygote genotype, a failed Whoop
      sync, an unlogged experiment week, and the Galleri result that reads as more reassuring than
      its 16.8% stage-I sensitivity earns.
- [x] Gaps section: un-speciated arsenic, the Q4-2024 draw that was ordered and never taken, the
      paternal side of the pedigree, dental, and the cognitive baseline nobody takes while well.
- [x] Items **resolve from elsewhere in the app** — importing the speciated panel clears the mercury
      item *and* the arsenic gap, adding paternal family history clears that gap, re-syncing Whoop
      clears the connector error.

### 4. Quick capture (＋) — Journey 12, entirely unimplemented ✅
**User problem:** the whole low-friction-capture journey has no UI at all. Nothing can be logged.
**UI:** a `＋ Capture` control in the always-on header opening a sheet with five sub-ten-second paths:
- [x] **Photo a bottle** → local parse with per-field confidence → an **interaction check runs before
      the log is accepted**. Potassium vs. his lisinopril is a genuine clinical interaction: rendered
      **red**, the log is held, and the user is routed to compose a question for the clinician.
      Creatine is the clean path — and still returns something he did not know (it raises serum
      creatinine without touching kidney function, so the next eGFR will read low for a reason).
- [x] **Voice log** → on-device transcript → structured draft → confirm. Berberine, deliberately:
      confirming it **flags the running glucose experiment as confounded from today**, with the
      reason on the card, instead of letting the walk effect quietly absorb the credit.
- [x] **Confirm a detected activity** — passive before manual: the run the watch already saw.
- [x] **One-tap EMA** — advances the *running experiment* on the spot (the tap is the payoff).
- [x] **A reading** (blood pressure) — straight into the home-cuff series, read against his own
      distribution, with an honest note that one reading is a data point and not a trend.
Each capture lands on the Timeline, in the Share inventory, and in the Now trace.

### 5. Experiments become live — Journey 11, all seven steps ✅
**User problem:** experiments are a museum exhibit. You cannot start one, log a day, flag a
confounder, or close a window — the running one is frozen at 21/30 forever.
- [x] **Log today** on the running experiment — adherence advances, a real sample is appended, the
      baseline-vs-intervention distribution and Cohen's *d* recompute in front of you.
- [x] **Flag a confounder day** with its reason, shown and down-weighted, never silently dropped.
- [x] **Close the window** → the verdict is computed **against the pre-registered criterion only**,
      from the samples actually collected. With the seeded data it lands on *inconclusive* — which is
      the honest answer and the whole point.
- [x] **Design a new experiment** — a short pre-registration flow (statement → metric → baseline →
      success bar → duration) with a **power warning before you invest the days**, then the criterion
      locks. Lands as a running card + a Timeline event + a Now item.

### 6. Correct, annotate, or exclude a record — Journey 12 §fallbacks, 06 §fallbacks ✅
**User problem:** the system can be wrong about you and there is no way to say so.
**UI:** every record drawer gains a *correction* footer — fix the value, add a note, or exclude it
from the agent's reasoning with a reason. Corrections are visible wherever the value renders
(a `corrected` mark), carried into the doctor packet, and logged in Now. The original is kept.

### 7. A connector breaks, loudly — Journey 08 §5, 14 §6 ✅
**User problem:** the fallback guarantee is the product's load-bearing promise and it is only ever
*asserted*. Nothing ever fails, so nothing ever degrades gracefully.
- [x] Whoop starts the session in a **neutral error state** (not the reserved red — an outage is a
      degradation, not a block) with the reason and a **Re-sync**.
- [x] Re-syncing backfills, clears the Now item, and updates the record count — the loop closes.

### 8. Share: show what is *excluded*, and keep the artifacts — Journey 13 §3, §7 ✅
**User problem:** the composer shows what is included; Journey 13's actual guarantee is the
**two-column Included / Excluded** preview, so you can point at the boundary. And a generated packet
vanishes — there is no artifact to re-open.
- [x] Two-column preview with the withheld set named, not implied.
- [x] Generated packets persist as artifacts, re-openable, and appear in Now.
- [x] The packet reflects imports, captures and corrections made this session.

### 9. Timeline earns its "what changed" claim ✅
- [x] Newly imported/captured events are badged `new` and the window auto-widens to include them.
- [x] A **What changed** strip above the tracks summarising the session's deltas.
- [x] Events open to a record that now offers correction (item 6).

---

### 10. Out-of-range values stopped borrowing the reserved red ✅
**User problem:** an elevated ApoB rendered in `--block` red taught the user that red means "bad
number", which is precisely what makes red useless when something is an actual stop.
- [x] `.flag.high` and the Timeline event dot are now neutral ink plus a direction arrow; red is
      reserved for genuine blocks (the held potassium log is the only place it fires).
      Per `design-system.md`'s colour law and journey 06's explicit instruction.

---

### 11. The answer was a dead end — hand off into the loop ✅ *(review pass)*
**User problem:** you are told your mercury is rising and your only remaining verb is to type
another question. Understanding is the first quarter of the loop; act / measure / share were each a
manual navigation away, rebuilding the context by hand.
- [x] Answers declare `actions` (`mock/agent.js`); `Ask` renders a hand-off row under the caveats.
- [x] **⁘ Test this** → `/experiments?propose=seafood` opens pre-registration on that hypothesis.
- [x] **◨ Add to a doctor packet** → `/share?propose=toxicology` opens the composer already scoped.

### 12. Ask no longer opens on a consent gate ✅ *(review pass)*
**User problem:** the app landed mid-thread on the pre-send panel, so the first thing anyone ever
saw was the privacy machinery arguing for itself — before it had answered anything. This was the
single loudest instance of the demo over-indexing on guardrails.
- [x] Ask opens empty with the cursor ready and the suggestions visible, per Interaction law 5.
      The gate is still unskippable; it is now reached *by asking*, which is when it means something.

---

## Verification

A jsdom harness drove the whole app end to end — every route rendered, then **51 interaction
assertions** across the import, capture, experiment, correction, share and connector flows (all
passing at the time of writing). The harness was a scratch file and is not checked in; re-create it
if these flows get reworked. `npm run build` passes.

**Note on the mock layer.** These fixtures were re-grounded mid-pass when the expanded dataset
landed (110 analytes × 9 draws, 30× WGS, DEXA, ageing clocks, Garmin, nutrition, screening). The
first draft's imports added Lp(a), TSH and vitamin D — all of which Ravi already has years of — and
prompted a colorectal screening he had in 2023. Everything above now keys off what the record
genuinely leaves open. If the mock layer moves again, re-check `state/fixtures.js` first: it is the
only place that asserts things about the base data.

## What I deliberately did NOT do, and why

- **An OHIF-style DICOM viewer.** Journey 06 §4 wants pan/zoom/window-level on your own scan. A
  convincing fake needs synthetic pixel data and a real interaction model; the payoff is a demo
  "wow" rather than a workflow the rest of the app depends on. The DICOM import instead lands a
  study, a local MedGemma impression, and the never-leaves-device badge — the *consequences* of the
  upload, which is what this pass is about. Viewer left for a later pass.
- **Editing the doctor-packet brief inline** (Journey 13 §5). Rich-text editing of a generated
  artifact is a lot of surface for one step; the composer's scope + questions already let the user
  author what matters. Deferred.
- ~~**Ask-side hand-offs.**~~ **Done in the review pass** (Journey 11 §1 "tap *test this* on a
  flagged pattern", Journey 09 §7 "share this"). Answers now declare an `actions` array in
  `mock/agent.js`; `Ask` renders it as a hand-off row and routes to `/experiments?propose=<key>` or
  `/share?propose=<domains>`. Both receiving ends consume the param on arrival and clear it, so the
  proposed experiment opens pre-selected at pre-registration and the packet composer opens already
  scoped to what the answer was about.
- **A mobile rail drawer / full dark-mode QA.** Carried over from the roadmap's open a11y item; not
  a user-problem gap, and unchanged by this pass.
- **Federated analytics, managed-cloud tier, install/update flows.** Out of scope per the brief.
- **Trimming the privacy prose.** Several views argue the egress case at length. Rather than delete
  the argument, this pass added enough *doing* around it that the prose is no longer the whole view.
  A dedicated copy-tightening pass would still help.
