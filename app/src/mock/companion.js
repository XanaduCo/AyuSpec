// The scripted Hermes thread for the Companion view, plus the per-message
// inspector metadata. Everything here is deterministic and hand-written — the
// thread is a *script* the reviewer steps through by tapping the same chips a
// real user would, not a simulation.
//
// The script is a sequence of BEATS. Each beat renders one or more messages and
// then waits on exactly one interaction (a chip tap, a scripted send, or a
// deliberate non-answer). The chosen option decides which acknowledgement is
// appended, so "skipped" really is logged as skipped. Advancing never branches
// the *structure* of the script — only the recorded values — so every path a
// reviewer takes still demonstrates the same five principles:
//
//   1. every message names the purpose that authorizes it (inspector: purpose ref)
//   2. sub-10-second affordances, one question at a time, a visible budget
//   3. non-response walks the backoff ladder down, and missing means MISSING
//   4. journal entries come back as graded, correctable extractions
//   5. channels are tiered — local push by default, one beat rides the opt-in
//      SMS bridge content-minimized, gateway-checked, and ledgered
//
// Anchored to Ravi's running experiment (mock/experiments.js):
// exp-postmeal-walks · week 4 · adherence 21/30 · travel confounder days 12–14.

export const EXPERIMENT = {
  id: 'exp-postmeal-walks',
  label: 'Post-meal walks · n-of-1',
  statement: 'Post-meal walks reduce my post-prandial glucose peaks.',
  week: 4,
  adherence: { done: 21, of: 30 },
}

// Channel descriptors the inspector renders. Local channels have no egress
// object at all — there is nothing to record leaving.
const LOCAL_PUSH = {
  label: 'ayuOS app · local push',
  transit: 'none — never left your network',
  posture: 'local',
}
const SMS_BRIDGE = {
  label: 'SMS bridge · opt-in',
  transit: 'carrier + SMS vendor (not end-to-end encrypted)',
  posture: 'egress',
  egress: {
    minimized: '“Adherence check ready · tap to log” — the question, the experiment name, and your reply stayed local; only the nudge rode the bridge.',
    gateway: 'PII gateway: pass — 0 identifiers in the minimized payload',
    ledger: 'lg-0142 · sms · 11 tokens · retained in full, locally',
  },
}

// ---------------------------------------------------------------------------
// The beats. `messages` render when the beat becomes current; `interaction`
// is what the reviewer does; `replies[choice]` is appended after they do it.
// Hermes messages carry `meta` for the "why this message" inspector.
// ---------------------------------------------------------------------------

export const beats = [
  // — Day 12 · a confounder capture, signal-triggered —
  {
    id: 'b-confounder',
    divider: 'Thu Jul 17 · day 12 of 30',
    messages: [
      {
        id: 'm-conf', from: 'hermes',
        text: 'Your watch jumped two time zones overnight — travelling? If so I can flag this week as a confounder for the walk experiment, so the analysis reads it honestly.',
        meta: {
          type: 'Confounder capture',
          trigger: 'Garmin timezone shift + no home-WiFi sync — matches the experiment’s pre-registered `travel` confounder flag',
          purpose: 'confounder · authorized by starting this experiment',
          purposeRef: EXPERIMENT.id,
          budget: '1 of 3 today · 9 of cap this experiment',
          channel: LOCAL_PUSH,
          lands: 'experiment → confounder_flags (days 12–14 window)',
          ladder: 'rung 1 · normal cadence',
        },
      },
    ],
    interaction: { kind: 'chips', options: [
      { id: 'flag', label: 'yes — flag it' },
      { id: 'noflag', label: 'not travelling' },
    ] },
    replies: {
      flag: {
        user: 'yes — flag it',
        ack: 'Flagged days 12–14 as travel. The interim read already notes this window sits inside the intervention arm — the verdict will discount it, not hide it.',
      },
      noflag: {
        user: 'not travelling',
        ack: 'Got it — no flag. The timezone blip is noted on the raw stream and nothing else changes.',
      },
    },
    ackLands: 'experiment → confounder_flags',
  },

  // — Day 18 · the plain adherence check —
  {
    id: 'b-adherence',
    divider: 'Wed Jul 23 · day 18 of 30',
    messages: [
      {
        id: 'm-adh', from: 'hermes',
        text: 'Walk after dinner yesterday? Your watch didn’t catch one in the evening window. — logging adherence for the post-meal-walk experiment, day 18 of 30.',
        meta: {
          type: 'Adherence check',
          trigger: 'Protocol window (dinner + 30 min) passed with no passive walk detection',
          purpose: 'adherence · authorized by starting this experiment',
          purposeRef: EXPERIMENT.id,
          budget: '1 of 3 today · 14 of cap this experiment',
          channel: LOCAL_PUSH,
          lands: 'experiment → adherence record, day 18',
          ladder: 'rung 1 · normal cadence',
        },
      },
    ],
    interaction: { kind: 'chips', options: [
      { id: 'took', label: '✓ walked' },
      { id: 'skip', label: 'skipped' },
      { id: 'snooze', label: 'snooze' },
    ] },
    replies: {
      took: { user: '✓ walked', ack: 'Logged — day 18 ✓. That’s 22 of 30 recorded.' },
      skip: { user: 'skipped', ack: 'Logged as skipped — that’s data too, and it counts exactly as much as a ✓ does.' },
      snooze: { user: 'snooze', ack: 'Snoozed. I’ll fold it into this evening’s digest — or it closes as not-recorded at midnight, never guessed.' },
    },
    ackLands: 'experiment → adherence record, day 18',
  },

  // — Same day · photo journal entry —
  {
    id: 'b-photo',
    messages: [],
    interaction: { kind: 'send', label: 'Send lunch photo', preview: 'photo' },
    replies: {
      send: {
        userKind: 'photo',
        user: 'Lunch · photo',
        ack: 'Logged: grain bowl, ~est. 620 kcal · joined to today’s CGM window (your 14-day nutrition window is active — this is the only time I ask about meals). Tap anything to fix; the photo itself stays in your store.',
      },
    },
    ackMeta: {
      type: 'Extraction echo',
      trigger: 'You sent a photo — replies to you never spend the message budget',
      purpose: 'journal capture · inside the experiment’s time-boxed nutrition window',
      purposeRef: EXPERIMENT.id,
      budget: 'unchanged · 1 of 3 today',
      channel: LOCAL_PUSH,
      lands: 'meal entry + photo → nutrition window · joined to CGM trace',
      ladder: 'rung 1 · normal cadence',
    },
    ackLands: 'nutrition window → meal entry (raw photo kept)',
  },

  // — Day 19 · free-text journal → graded extraction with an edit affordance —
  {
    id: 'b-freetext',
    divider: 'Thu Jul 24 · day 19 of 30',
    messages: [],
    interaction: { kind: 'send', label: 'Send: “skipped the walk — energy crashed at 3pm, slept badly”' },
    replies: {
      send: {
        user: 'skipped the walk — energy crashed at 3pm, slept badly',
        ack: 'Here’s what I took from that — your words are kept verbatim underneath:',
        extraction: [
          { k: 'adherence', label: 'walk · skipped (day 19)', grade: 'stated' },
          { k: 'confounder', label: 'poor sleep · flag', grade: 'stated' },
          { k: 'subjective', label: 'energy 2/5 · 3pm', grade: 'inferred · low' },
        ],
      },
    },
    ackMeta: {
      type: 'Extraction echo',
      trigger: 'You sent a journal line — extraction ran on the local extractor role',
      purpose: 'journal capture · graded, shown for correction, raw text kept',
      purposeRef: EXPERIMENT.id,
      budget: 'unchanged · 0 of 3 today',
      channel: LOCAL_PUSH,
      lands: 'adherence day 19 + confounder flag + self-feedback observation',
      ladder: 'rung 1 · normal cadence',
    },
    ackLands: 'adherence day 19 · confounder flag · self-feedback obs',
  },

  // — the correction on the low-confidence field —
  {
    id: 'b-edit',
    messages: [],
    interaction: { kind: 'chips', options: [
      { id: 'right', label: 'looks right' },
      { id: 'edit', label: 'edit: energy → 3/5' },
    ] },
    replies: {
      right: { user: 'looks right', ack: 'Kept as-is. The energy score stays marked “inferred” — a stated score would outrank it if you ever correct it.' },
      edit: { user: 'energy → 3/5', ack: 'Corrected: energy 3/5, now marked “stated” instead of “inferred”. The raw sentence is unchanged — the structure is my interpretation, your words are the record.' },
    },
    ackLands: 'self-feedback observation (provenance updated)',
  },

  // — Day 20 · the SMS-bridge ping, then the non-response stretch begins —
  {
    id: 'b-sms',
    divider: 'Fri Jul 25 · day 20 of 30',
    messages: [
      {
        id: 'm-sms', from: 'hermes', channelTag: 'via SMS bridge',
        text: 'Adherence check ready · tap to log',
        subtext: 'Opens the local surface — the question and your answer never ride the bridge.',
        meta: {
          type: 'Adherence check · bridged',
          trigger: 'Away from home network (you opted into the SMS bridge for exactly this); protocol window passed',
          purpose: 'adherence · authorized by starting this experiment',
          purposeRef: EXPERIMENT.id,
          budget: '1 of 3 today · 16 of cap this experiment',
          channel: SMS_BRIDGE,
          lands: 'experiment → adherence record, day 20',
          ladder: 'rung 1 · normal cadence',
        },
      },
    ],
    interaction: { kind: 'lapse', label: 'Don’t answer — let it lapse' },
    replies: {
      lapse: {
        sys: 'No reply by midnight → day 20 marked not_recorded. Not assumed, not imputed — the analysis will show the hole. Ladder: rung 1, skip — this prompt is not repeated.',
      },
    },
    ackLands: 'experiment → adherence day 20 = not_recorded',
  },

  // — Day 21 · second lapse → the ladder steps down to batching —
  {
    id: 'b-lapse2',
    divider: 'Sat Jul 26 · day 21 of 30',
    messages: [
      {
        id: 'm-adh2', from: 'hermes',
        text: 'Walk after dinner? — day 21 of 30.',
        meta: {
          type: 'Adherence check',
          trigger: 'Protocol window passed, no passive confirmation',
          purpose: 'adherence · authorized by starting this experiment',
          purposeRef: EXPERIMENT.id,
          budget: '1 of 3 today',
          channel: LOCAL_PUSH,
          lands: 'experiment → adherence record, day 21',
          ladder: 'rung 1 · one unanswered behind this thread',
        },
      },
    ],
    interaction: { kind: 'lapse', label: 'Let this one lapse too' },
    replies: {
      lapse: {
        sys: 'Second consecutive non-answer → ladder steps to rung 2. Individual pings stop; asks fold into one end-of-day digest.',
      },
    },
    ackLands: 'experiment → adherence day 21 = not_recorded',
  },

  // — that evening · the batch digest —
  {
    id: 'b-batch',
    messages: [
      {
        id: 'm-batch', from: 'hermes',
        text: 'End-of-day digest — two open items, one tap each. No rush; unanswered items close as not-recorded at midnight.',
        digest: [
          { label: 'Walk today (day 21)?', chips: ['✓', '✗'] },
          { label: 'Energy today?', chips: ['1', '2', '3', '4', '5'] },
        ],
        meta: {
          type: 'End-of-day batch · ladder rung 2',
          trigger: 'Two consecutive unanswered prompts collapsed the thread into a digest',
          purpose: 'adherence + EMA · same experiment authorization',
          purposeRef: EXPERIMENT.id,
          budget: '2 of 3 today (the digest is one message)',
          channel: LOCAL_PUSH,
          lands: 'experiment → adherence + self-feedback, if answered',
          ladder: 'rung 2 · batched',
        },
      },
    ],
    interaction: { kind: 'lapse', label: 'Ignore the digest for a week' },
    replies: {
      lapse: {
        sys: 'Digest unanswered for a week (compressed here) → ladder steps to rung 3. Down to one weekly summary. Days 21–27 are marked not_recorded — the interim analysis now flags the stretch and degrades its own confidence.',
      },
    },
    ackLands: 'days 21–27 = not_recorded · power degraded honestly',
  },

  // — Day 27 · weekly digest, and the one-word mute —
  {
    id: 'b-weekly',
    divider: 'Fri Aug 1 · day 27 of 30',
    messages: [
      {
        id: 'm-weekly', from: 'hermes',
        text: 'Weekly summary — the only message you’ll get at this cadence. Mark the week if you like, or leave it blank; blank stays blank in the record.',
        digest: [
          { label: 'Walks this week, roughly?', chips: ['mostly yes', 'mixed', 'mostly no', 'leave blank'] },
        ],
        meta: {
          type: 'Weekly digest · ladder rung 3',
          trigger: 'Batched digest went unanswered for a week',
          purpose: 'adherence catch-up · same experiment authorization',
          purposeRef: EXPERIMENT.id,
          budget: '1 of 3 today · first message in 6 days',
          channel: LOCAL_PUSH,
          lands: 'experiment → coarse weekly adherence marks (labelled as recall, not observed)',
          ladder: 'rung 3 · weekly',
        },
      },
    ],
    interaction: { kind: 'send', label: 'Reply: “mute”' },
    replies: {
      send: {
        user: 'mute',
        ack: 'Muted — adherence pings for this experiment are off. Days will be marked not-recorded, never guessed, and the analysis will say so. Say “resume” anytime.',
      },
    },
    ackMeta: {
      type: 'Mute notice',
      trigger: 'You said “mute” — one word, honored from any channel',
      purpose: 'system notice · the only purpose-ref-free message type',
      purposeRef: null,
      budget: 'replies don’t spend budget',
      channel: LOCAL_PUSH,
      lands: 'thread state → muted · nothing imputed meanwhile',
      ladder: 'rung 4 · dormant (user-invoked)',
    },
    ackLands: 'thread → muted',
  },

  // — the way back, one word again —
  {
    id: 'b-resume',
    messages: [],
    interaction: { kind: 'chips', options: [
      { id: 'resume', label: 'say “resume”' },
      { id: 'stay', label: 'leave it muted' },
    ] },
    replies: {
      resume: { user: 'resume', ack: 'Resumed — next check tomorrow after dinner. The muted stretch stays in the record as not_recorded; nothing was backfilled.' },
      stay: { sys: 'Thread stays dormant. No active prompts → Hermes is silent. Silence is the default state, not a failure state.' },
    },
    ackLands: 'thread state',
  },
]

// The principles strip rendered beside the phone — the rules in force, short.
export const principles = [
  { k: 'Silent without purpose', v: 'Every message names the experiment, goal, or schedule that authorizes it. No streaks, no “we miss you” — no active experiment means no messages.' },
  { k: 'Budgeted & sub-10s', v: '3 messages/day cap, quiet hours, one question at a time, answerable in a tap. Overflow batches; it never spills.' },
  { k: 'Backoff ladder', v: 'Non-answer steps down: skip → end-of-day batch → weekly → dormant. Volume only ever decreases; answering steps it back up.' },
  { k: 'Missing ≠ imputed', v: 'An unanswered check is recorded as not_recorded and degrades the experiment’s confidence honestly. Never assumed either way.' },
  { k: 'Local first, bridges labeled', v: 'Default channel is local push — zero third-party transit in this configuration. The SMS bridge is opt-in, content-minimized, gateway-checked, ledgered.' },
]
